# Validação SDD 10 — 2026-10-04

## Reprodução obrigatória antes da adaptação (10.8)

Chrome headless isolado, viewport CSS com DPR 1 e altura 800 px. A estrutura real
`SidebarLayout` reservava 224 px em todas as larguras:

| Viewport | Lateral antes | Conteúdo antes | Lateral fechada depois | Conteúdo depois |
|---|---:|---:|---:|---:|
| 360 | 224 | 136 | 0 | 360 |
| 390 | 224 | 166 | 0 | 390 |
| 768 | 224 | 544 | 224 | 544 |

[Antes em 360 px](before-360.png) · [Projetos em 360 px](projects-360.png) ·
[Menu em 360 px](menu-360.png) · [Sprint em 390 px](sprint-390.png) ·
[Documentação em 360 px](documentation-360.png) · [Documentação em 768 px](documentation-768.png).

## Método e limites

A reprodução foi feita numa rota local temporária, removida antes da entrega.
Usou `SidebarLayout`, `SprintBoard`, `DocumentSidebar` e `ProjectCharter` reais,
com provedores de permissões/toast e dados fictícios. A lista de projetos foi uma
fixture de conteúdo dentro da mesma estrutura lateral; não houve sessão de
produção nem verificação de dados reais. Requisições documentais foram respondidas
por fixtures via CDP; server actions foram bloqueadas com 503. Por isso o minicard
mostra a falha de carregamento do timer, comportamento esperado nesta simulação.
A validação de contrato/persistência permanece nos testes automatizados.

Projetos, sprint e documentação foram renderizados nas três larguras. Nas telas
estreitas, abrir o menu manteve o conteúdo com largura total e tornou o fundo
`inert`. Tab nativo a partir do fim do menu permaneceu dentro do overlay. Escolher
uma área fechou o menu. Escape, retorno do foco, expansão desktop e Shift+Tab são
verificados também nos testes de componentes.

Rotação foi simulada em 800 × 390 px. Reflow equivalente a zoom de 200% foi medido
em 195 × 400 CSS px, DPR 2 (largura física 390); não é uma certificação de todos os
controles de zoom de navegadores. As três áreas e o menu foram verificados nessa
largura. `document.body.scrollWidth` permaneceu igual a `innerWidth` em todos os
cenários. Kanban e prévia A4 mantêm rolagem horizontal dentro de suas regiões.
Os resultados geométricos completos estão em [measurements.json](measurements.json).

## Regressões automatizadas

- Kanban: 403, 500, rede, movimento independente confirmado durante outra falha,
  renomeação/exclusão rejeitadas e retry de anexo sem recriar tarefa.
- Formulário: conserva campos/arquivos, bloqueia envio duplo e fecha só no sucesso.
- Timer: estado compartilhado, pausa rejeitada, cliques rápidos, timeout e leitura
  desconhecida; testes existentes mantêm os lançamentos manuais.
- Termo: debounce, PATCH lento/rejeitado, flush anterior à versão, envio único,
  serialização de edições, reset durante resposta antiga e proteção de saída.
- Recuperação: cópia na mesma aba vinculada ao autor/projeto; falta de identidade,
  permissão e expiração não revelam conteúdo; confirmação limpa a cópia.
- Teclado: Enter/Space com e sem filtro, sidebar recolhida sem links/busca no foco,
  navegação móvel, histórico com diálogo aninhado, Escape somente superior,
  restauração de foco e overlay sem controles focáveis.

O workflow `UI Reliability` executa lint, tipos e a suíte raiz em toda PR.
Os checks PostgreSQL/HTTP e de segurança existentes continuam independentes.
