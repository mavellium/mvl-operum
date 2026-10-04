import 'server-only'
import { verifySession } from '@/lib/dal'
import { can, exigirPermissao, type SessaoAuthz } from './authz'
import { findById as loadProject } from './projectService'
import type { Permissao } from '@/lib/permissoes'

/** DAL de leitura das páginas: também protege metadata e acesso direto à subrota. */
export async function findById(id: string) {
  const session = await verifySession()
  if (!(await can(session, id, 'projeto:ver'))) return null
  return loadProject(id)
}

export async function requireProjectPermission(session: SessaoAuthz, projectId: string, permission: Permissao) {
  await exigirPermissao(session, projectId, 'projeto:ver')
  await exigirPermissao(session, projectId, permission)
}

export async function canProjectPermission(session: SessaoAuthz, projectId: string, permission: Permissao) {
  return (await can(session, projectId, 'projeto:ver')) && (await can(session, projectId, permission))
}
