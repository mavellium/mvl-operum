# Interface, UX e acessibilidade do Operum

## Quais falhas impedem confiar no salvamento e na execução das ações?

### Takeaway
Análise estática na revisão `d90456ff`: os maiores problemas são respostas de erro ignoradas e interfaces que anunciam conclusão antes de confirmar persistência. Não executei fluxos no navegador nem alterei dados; reprodução empírica faz parte dos critérios propostos. Durante a pesquisa o checkout avançou para `c92d3934`; links abaixo permanecem fixos na revisão inicial para revisão auditável.

### Cited Findings

**UX-01 — P1: Reverter alterações otimistas do Kanban quando a API falhar.**
- Evidência: arraste de colunas/cards/backlog aplica estado local e ignora o resultado da action; renomear e excluir seguem o mesmo padrão. As actions capturam exceções e retornam `{error}`, logo `await` sozinho não detecta fracasso. Fontes: [SprintBoard.tsx:266](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/sprint/SprintBoard.tsx#L266), [SprintBoard.tsx:412](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/sprint/SprintBoard.tsx#L412), [sprintBoard.ts:155](https://github.com/mavellium/mvl-operum/blob/d90456ff/app/actions/sprintBoard.ts#L155).
- Impacto inferido: usuário acredita ter movido/excluído um item; ao recarregar ele reaparece ou retorna à posição anterior, com perda de confiança no quadro.
- Aceite proposto: em 403, 500 e falha de rede, restaurar o estado anterior ou reconciliar com servidor, mostrar mensagem acionável e permitir retry; manter operações simultâneas independentes sem rollback apagar uma mudança válida posterior; testes de falha em mover, renomear e excluir.
- Não duplica SDD 2.5: trata persistência/recuperação em todas as movimentações, não regra de motivos para retrocesso.

**UX-02 — P1: Preservar o formulário do card até a criação/edição ser confirmada.**
- Evidência: contrato `onSubmit` retorna `void`; `handleSave` chama-o e fecha imediatamente. A criação de backlog também fecha mesmo sem `result.card`; criação no quadro só atua no sucesso, sem mostrar erro. Fontes: [CardModal.tsx:27](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/card/CardModal.tsx#L27), [CardModal.tsx:291](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/card/CardModal.tsx#L291), [SprintBoard.tsx:225](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/sprint/SprintBoard.tsx#L225), [SprintBoard.tsx:427](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/sprint/SprintBoard.tsx#L427).
- Impacto inferido: título, descrição e seleção de anexos precisam ser preenchidos novamente após erro; fechamento transmite sucesso falso.
- Aceite proposto: contrato assíncrono com resultado explícito, estado salvando e prevenção de envio duplo; manter campos/anexos selecionados em erro; fechar apenas no sucesso; distinguir card criado com falha parcial de anexo/responsável e oferecer retentativa sem duplicar card.
- Escopo distinto de autosave da descrição já previsto no SDD 1.6.

**UX-03 — P1: Manter timer sincronizado quando pausar/iniciar falhar.**
- Evidência: minicard define timer parado antes de `pauseTimerAction`, ignora erro e apaga entryId; modal também seta parado e apaga entryId mesmo quando recebe erro. Inicialização converte erro em zero/sem timer. Fontes: [Card.tsx:91](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/card/Card.tsx#L91), [Card.tsx:131](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/card/Card.tsx#L131), [CardTimer.tsx:134](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/card/CardTimer.tsx#L134), [time.ts:45](https://github.com/mavellium/mvl-operum/blob/d90456ff/app/actions/time.ts#L45).
- Impacto inferido: contador parece pausado enquanto registro continua rodando no servidor; possível lançamento excessivo de horas. Não é a validação de horas/dia do SDD 4.4.
- Aceite proposto: confirmar parada antes de descartar entryId; falha mantém estado confirmado ou estado desconhecido explícito, com reconciliação/retry; erro de carregamento não vira 00:00; minicard e modal refletem o mesmo estado; testar pause rejeitado, timeout e cliques rápidos.

**UX-04 — P1: Confirmar autosave do Termo antes de salvar versão ou sair.**
- Evidência: campos de texto são enviados após debounce de 1200 ms; PATCH malsucedido não gera feedback e catch é silencioso. Criar versão envia apenas metadados e não aguarda flush dos campos atuais; o indicador autoSaving considera apenas macrofases. Fontes: [ProjectCharter.tsx:127](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/projetos/documentacao/ProjectCharter.tsx#L127), [ProjectCharter.tsx:184](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/projetos/documentacao/ProjectCharter.tsx#L184), [ProjectCharter.tsx:324](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/projetos/documentacao/ProjectCharter.tsx#L324), [ProjectCharter.tsx:406](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/projetos/documentacao/ProjectCharter.tsx#L406).
- Impacto inferido: versão salva logo após digitação pode conter conteúdo anterior; falha de rede pode deixar texto apenas na tela sem aviso.
- Aceite proposto: estados pendente/salvando/salvo/erro para todos os campos; flush confirmado antes de versionar; não criar versão se flush falhar; preservar rascunho recuperável e avisar na saída com pendências; testes com debounce e PATCH lento/rejeitado, inclusive respostas fora de ordem.
- Complementa SDD 7.4, sem repetir separação de formulário ou histórico por campo: aqui é consistência e confiabilidade do salvamento existente.

### Inferences
Prioridades P1 acima representam risco de trabalho perdido ou falsa informação de persistência. São inferências do fluxo de controle e precisam de testes de regressão; não houve medição de incidência em produção.

### Gaps
Não foram avaliados latência real, volume de falhas ou comportamento com dados reais. Algumas fontes foram modificadas após o início por outro trabalho; confirmar o diff da branch vigente antes de implementar.

## Quais obstáculos concretos existem para teclado e leitores de tela?

### Takeaway
Há fundamentos positivos (Modal possui focus trap e labels em botões), mas abertura de card e componentes recolhidos ainda possuem lacunas. Recomendo cards focados nos componentes compartilhados para ampliar cobertura.

### Cited Findings

**UX-05 — P2: Permitir abrir cards pelo teclado independentemente do arraste.**
- Evidência: superfície principal do card é div com props do Draggable e apenas `onClick={onClick}`; título é parágrafo e não há link/botão dedicado para abrir. Com filtro, drag é desativado. O teste de clique usa mock com dragHandleProps vazio e não verifica abertura com teclado. Fontes: [Card.tsx:159](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/card/Card.tsx#L159), [SprintBoard.tsx:147](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/sprint/SprintBoard.tsx#L147), [Card.click.test.tsx:7](https://github.com/mavellium/mvl-operum/blob/d90456ff/__tests__/components/card/Card.click.test.tsx#L7).
- Impacto inferido: foco/teclas destinadas a arrastar não oferecem uma ação inequívoca para abrir detalhes, especialmente com filtros ativos.
- Aceite proposto: botão/link de abertura acessível pelo nome do card, Enter/Space conforme semântica, foco visível; arraste com teclado continua disponível sem conflito; validar sem mouse com e sem filtro e preservar ações de timer/excluir.
- Distinto do SDD 4.2: aqui não é resultado da busca, é o próprio minicard do Kanban.

**UX-06 — P2: Retirar sidebar recolhida da ordem de foco.**
- Evidência: recolhimento aplica `w-0` e transform ao conteúdo, mantendo links, busca, troca de instituição e botão de sair montados; não aplica inert/hidden. Fontes: [SidebarLayout.tsx:74](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/layout/SidebarLayout.tsx#L74), [SidebarLayout.tsx:114](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/layout/SidebarLayout.tsx#L114).
- Impacto inferido: Tab pode percorrer controles invisíveis e leitor de tela continuar anunciando navegação recolhida.
- Aceite proposto: região recolhida sem foco/interação nem exposição indevida; foco vai ao botão expandir ao recolher e volta a ponto previsível ao expandir; aria-expanded sincronizado; teste com Tab/Shift+Tab, links e campo de busca.

**UX-07 — P2: Unificar gestão de foco de Drawer e Modal.**
- Evidência: Drawer declara `aria-modal` mas só implementa Escape e foco inicial, sem contenção/restauração de foco. Modal tem trap, mas título usa ID fixo `modal-title`, cada instância registra Escape no document e não restaura o acionador. Fontes: [Drawer.tsx:28](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/ui/Drawer.tsx#L28), [Modal.tsx:60](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/ui/Modal.tsx#L60), [Modal.tsx:98](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/ui/Modal.tsx#L98). Drawer é usado no histórico do Termo: [ProjectCharter.tsx:623](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/projetos/documentacao/ProjectCharter.tsx#L623).
- Impacto inferido: teclado alcança página atrás do histórico; overlays sobrepostos podem competir por foco e Escape; título pode apontar ao modal errado.
- Aceite proposto: trap e restauração consistentes; só overlay superior reage a Escape; fundo sem interação; IDs de título únicos; testes com histórico e diálogo aninhado, abertura/fechamento e nenhum controle focável.

### Inferences
Os achados descrevem ausência de mecanismos no código, não laudo de conformidade WCAG. A biblioteca de arraste pode adicionar comportamento próprio; teste integrado sem mock é necessário para UX-05.

### Gaps
Sem sessão de navegador/leitor de tela, não avaliei contraste, foco visual real ou experiências assistivas em dispositivos específicos.

## Quais melhorias de navegação e celular merecem validação?

### Takeaway
O layout lateral reserva largura fixa em qualquer viewport e inicia aberto. Existe oportunidade concreta de adaptar a casca do aplicativo a telas estreitas sem modificar regras de negócio.

### Cited Findings

**UX-08 — P2: Adaptar navegação lateral para celular com menu sobreposto.**
- Evidência: AppShell coloca sidebar e main em flex horizontal; SidebarLayout reserva `w-56` sem breakpoint, e GlobalSidebar/ProjectSidebar iniciam `collapsed=false`, alterando apenas via localStorage ou botão. Fontes: [AppShell.tsx:27](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/layout/AppShell.tsx#L27), [SidebarLayout.tsx:74](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/layout/SidebarLayout.tsx#L74), [GlobalSidebar.tsx:43](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/layout/GlobalSidebar.tsx#L43), [ProjectSidebar.tsx:65](https://github.com/mavellium/mvl-operum/blob/d90456ff/components/layout/ProjectSidebar.tsx#L65).
- Impacto inferido: primeira visita em viewport de 360–390 px deixa pequena parte da largura para conteúdo até recolher manualmente. Não afirmo sobreposição observada, pois a análise foi estática.
- Aceite proposto: em telas estreitas, conteúdo usa largura disponível e menu abre como overlay acessível; navegação fecha após escolha; comportamento desktop preservado; validar 360, 390 e 768 px em projetos, sprint e documentação, inclusive rotação, teclado e zoom; sem rolagem horizontal da página fora de áreas explicitamente bidimensionais.

### Inferences
Ajustar a casca traz impacto transversal maior que corrigir largura individualmente em cada tela. UX-06 deve ser combinado à implementação para não reproduzir foco invisível no menu mobile.

### Gaps
Sem browser, não avaliei estética empiricamente, responsividade de todos os formulários, reflow dos documentos ou desempenho perceptivo. Nenhum card deve alegar teste visual realizado. Não foram criados cards por este agente; estes oito candidatos devem ser deduplicados com backlog vivo e alterações concorrentes pelo coordenador.

Deduplicação final: títulos dos 56 cards de `backlog.json` foram lidos; não encontrei duplicata exata dos oito candidatos. Há relação temática de UX-04 com o card `cmulhtc8n000701nxxz8h3mmi` (formulário do Termo) e UX-08 com `cmuk8bwru000s01jw5fqsvcx5` (usar 100% da tela de sprint); o primeiro é defeito distinto de persistência, o segundo recomenda revisão responsiva transversal. Para reduzir a primeira rodada a sete cards, priorizar UX-01 a UX-07 e manter UX-08 como oportunidade a validar visualmente. Fonte da deduplicação: [backlog.json](./backlog.json).

Verificação final de atualidade: comparados todos os 14 arquivos de suporte entre `d90456ff` e `c92d3934`, e contra o diff local. Somente CardModal.tsx e SprintBoard.tsx mudaram entre commits (preview/download de anexos e abertura via query string); as rotinas dos achados permanecem inalteradas. Nenhum desses arquivos tinha diff local na verificação. Os oito candidatos continuam aplicáveis; por decisão do coordenador, incluir também UX-08 como proposta com validação mobile obrigatória, mantendo a ressalva de análise estática.
