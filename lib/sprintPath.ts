/**
 * URL canônica do board de uma sprint: `/projetos/:projectId/sprints/:sprintId`,
 * que deixa explícito a qual projeto a sprint pertence e renderiza o menu do projeto.
 *
 * Sem `projectId` cai em `/sprints/:sprintId`, que apenas descobre o projeto e
 * redireciona para a rota canônica (mantém links antigos funcionando).
 */
export function sprintPath(sprintId: string, projectId?: string | null, cardId?: string | null): string {
  const base = projectId ? `/projetos/${projectId}/sprints/${sprintId}` : `/sprints/${sprintId}`
  return cardId ? `${base}?card=${encodeURIComponent(cardId)}` : base
}
