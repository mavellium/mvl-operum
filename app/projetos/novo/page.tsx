import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { canProjectPermission } from '@/services/projectAccess'
import { permissoesNoProjeto } from '@/services/authz'
import { TODAS } from '@/lib/permissoes'
import { ProjectPermissionsProvider } from '@/components/permissoes/ProjectPermissions'
import ProjetoFormPage from '@/components/projetos/ProjetoFormPage'

export default async function ProjetoFormRoute({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const session = await verifySession()
  const { edit } = await searchParams
  if (edit ? !(await canProjectPermission(session, edit, 'projeto:editar')) : session.role !== 'admin') notFound()
  const permissions = edit ? [...await permissoesNoProjeto(session.userId, session.tenantId, session.role, edit)] : [...TODAS]
  return <ProjectPermissionsProvider permissions={permissions}><ProjetoFormPage canAssignRoles={session.role === 'admin'} /></ProjectPermissionsProvider>
}
