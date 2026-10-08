# Guia editorial de treinamento

## Público e voz

Dono de salão, barbearia ou profissional autônomo com pouca familiaridade com sistemas. Escreva português brasileiro natural, como alguém experiente ensinando ao lado da pessoa.

Cada etapa explica: **o que é, para que serve, o que fazer e o resultado esperado**. Evite CRUD, endpoint, payload, banco, provider e RLS na interface. Use os nomes reais dos botões.

Exemplo: “Clique em Novo Serviço. Informe o preço e a duração. A duração reserva esse tempo na agenda.”

## Tours

- Título curto, corpo de 1–3 frases; dica opcional.
- Tela simples: 3–6 passos. Tela complexa: divida por objetivo/aba.
- Nunca automatize envio, cobrança, alteração, exclusão, desconexão ou cancelamento.
- “Clique” no desktop, “toque” quando específico de celular.
- Campo condicional precisa de texto alternativo.
- Não prometa conclusão: “Quando você salvar...” em vez de “Salvei para você”.
- Não afirme funcionalidade sem conferir handler, armazenamento e consumidor real.

## Artigos

- Título orientado a tarefa: “Como cadastrar seu primeiro serviço”.
- Resumo em uma frase; tempo aproximado; dificuldade.
- Passos curtos e numerados pela interface.
- `notes` explica dependências e limitações reais. Simulação deve ser chamada de simulação.
- `keywords` usa palavras da pessoa: agenda, funcionário, zap, preço, mensagem em massa.
- Não explicar 22 telas no primeiro minuto; começar por dados, horários, serviços, equipe e agendamento.

## Screenshots

Somente telas reais do SysHair local com dados fictícios. Nunca dados pessoais, tokens, QR verdadeiro, API keys, telefone real, cobranças ou dados financeiros reais.

WebP, captura limpa, lazy loading. Use `alt` explicando a região; hotspots percentuais numerados quando necessário. `pending: true` até existir captura verificada — nunca inventar imagem ou apontar arquivo inexistente como pronto.

## Revisão

1. Compare texto com o código/UI atual.
2. Confira nome/rota dos botões e dependências.
3. Separe “ação disponível” de “ação realmente implementada”.
4. Remova promessa financeira ou de automação não comprovada.
5. Teste alvo e alternativa com lista vazia, dialog fechado e mobile.
6. Rode `npm run training:check`.
7. Mudança significativa exige nova versão e novas capturas.

Fonte primária: código atual. Documentação antiga ou pedido conceitual não comprovam funcionalidade.
