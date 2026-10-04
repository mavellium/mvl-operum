# Materiais locais preservados

Revisão de 2026-10-03 das 62 alterações que permaneciam no checkout de `feat/fase-5-permissoes`.

- `sdd-5.2/`: patch íntegro de 16 arquivos de revisão documental, baseado em `3a9179cd`; implementação incompleta e inativa, a reconciliar com a main quando o usuário iniciar 5.2.
- `manutencao/`: utilitário avulso de alteração de compose, arquivado como texto para revisão antes de reutilizar.
- `../../reports/` e `../../research_notes/`: relatório da avaliação geral e evidências/backlog de apoio preservados como registros históricos. O estado dos cards deve ser conferido antes de usá-los como lista atual de pendências.
- `../../.codex/`: perfis de agentes e lembrete local de arquitetura do projeto. Foram preservados com sintaxe TOML/JSON validada; não representam aprovação de segurança ou deploy.
- `../../AGENTS.md` e `../../dev-notes.md`: regras de manutenção e comandos de desenvolvimento. Credenciais foram removidas das notas publicadas.

As alterações de custos, gateway e permissões já integradas pelas PRs #37–#39 foram substituídas pelo código aprovado da main no checkout, sem republicar cópias antigas. A configuração pessoal `.claude/settings.local.json` permanece local. A cópia integral original foi preservada localmente antes da organização.

Este conjunto não altera código executável, schema ativo, migrations ativas, contratos ou arquitetura implementada. Por isso a versão do produto permanece 1.10.0; o incremento da revisão documental será decidido na implementação efetiva. Os patches não são aplicados por instalação, build ou deploy.
