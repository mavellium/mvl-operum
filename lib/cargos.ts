/**
 * Função exibida para um membro no projeto: os cargos do projeto
 * (UserProject.role, lista separada por vírgula — a mesma de Stakeholders)
 * ou, sem eles, o cargo global do usuário.
 */
export function cargoNoProjeto(roleNoProjeto: string | null | undefined, cargoGlobal?: string | null): string | null {
  const cargos = (roleNoProjeto ?? '').split(',').map(c => c.trim()).filter(Boolean)
  if (cargos.length > 0) return cargos.join(', ')
  return cargoGlobal?.trim() || null
}
