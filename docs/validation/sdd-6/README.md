# Fase 6 — validação

- Testes de geometria verificam árvores mistas de 60 nós, larguras diferentes, cartões de 162 px, limites positivos e ausência de interseções.
- Rollup financeiro verifica taxas distintas, esforço previsto/real, materiais, descendentes recolhidos e taxa ausente sem falso custo zero.
- Gantt verifica prazo/duração, data impossível, linha sem prazo, zoom e expansão sem mutação da árvore.
- Suite completa: **1778 testes aprovados, 76 ignorados**, 180 arquivos aprovados (execução com rede local autorizada para o teste HTTPS do MCP). O teste de novidades passou a acompanhar o changelog instalado em vez de fixar uma versão.
- Typecheck da aplicação (`pnpm typecheck`) aprovado. A configuração principal de `tsc --noEmit` também inclui testes e todos os microsserviços e não equivale ao check da aplicação.
- Exportações clássicas e reducer mantêm sua cobertura existente. Validação visual/CI será registrada após execução.
