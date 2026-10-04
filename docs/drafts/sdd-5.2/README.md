# Rascunho local do SDD 5.2 preservado

Preservado em 2026-10-03, antes de sincronizar o checkout antigo com a main.

Este patch reúne alterações locais de revisão documental: serviço de snapshots/rascunhos, rota de revisões, histórico, adaptação de charter/stakeholders/EAP/atas e schema/migration. **É material inativo e não validado**, não uma implementação concluída nem autorização de deploy/migration. O usuário autorizou a retomada em 04/10/2026; a implementação conciliada está na entrega 1.12.0, não neste patch arquivado.

A base original é `3a9179cd` (Operum 1.8.0). Enquanto essas mudanças ficaram locais, as PRs #37 (custos), #38 (Next.js) e #39 (consumidores de permissões) foram integradas. Não aplicar diretamente em main: o patch pressupõe o estado anterior à adoção completa das permissões e exige conciliação com o código atual.

Para retomar, criar uma branch isolada da main atual, comparar o patch com o catálogo e guardas atuais, reconciliar rotas/actions, conferir o contrato Prisma e migration, implementar testes de tenant/permissões/aprovação e validar a suíte. Nenhuma migration deste rascunho deve rodar antes dessa revisão. O incremento de versão será escolhido na entrega implementada; arquivar material inativo não altera a versão do produto.

As alterações de custos e do gateway já integradas foram excluídas deste arquivo para evitar restaurar versões antigas sobre o código aprovado.

Retomada em 04/10/2026: o serviço/rotas/interface foram conciliados com a main, com validação e publicação/auditoria transacionais. A migration ativa é `20261004000000_document_revisions`; a migration antiga contida neste arquivo nunca deve ser aplicada em paralelo. Este material permanece apenas como registro do trabalho anterior.
