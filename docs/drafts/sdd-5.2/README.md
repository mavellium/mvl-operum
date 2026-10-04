# Rascunho local do SDD 5.2 preservado

Preservado em 2026-10-03, antes de sincronizar o checkout antigo com a main.

Este patch reúne alterações locais de revisão documental: serviço de snapshots/rascunhos, rota de revisões, histórico, adaptação de charter/stakeholders/EAP/atas e schema/migration. **É material inativo e não validado**, não uma implementação concluída nem autorização de deploy/migration. A continuação de 5.2 aguarda comando do usuário.

A base original é `3a9179cd` (Operum 1.8.0). Enquanto essas mudanças ficaram locais, as PRs #37 (custos), #38 (Next.js) e #39 (consumidores de permissões) foram integradas. Não aplicar diretamente em main: o patch pressupõe o estado anterior à adoção completa das permissões e exige conciliação com o código atual.

Para retomar, criar uma branch isolada da main atual, comparar o patch com o catálogo e guardas atuais, reconciliar rotas/actions, conferir o contrato Prisma e migration, implementar testes de tenant/permissões/aprovação e validar a suíte. Nenhuma migration deste rascunho deve rodar antes dessa revisão. O incremento de versão será escolhido na entrega implementada; arquivar material inativo não altera a versão do produto.

As alterações de custos e do gateway já integradas foram excluídas deste arquivo para evitar restaurar versões antigas sobre o código aprovado.
