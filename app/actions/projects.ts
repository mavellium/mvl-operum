'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import type { UpdateProjectInput, MacroFaseInput } from '@/lib/validation/projectSchemas'
import {
  createProject,
  findAllByTenant,
  findById,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  getMembersWithDetails,
  updateUserProject,
  getUserProjectsWithDetails,
} from '@/services/projectService'
import { setProjectManagerRole } from '@/services/projectRoleService'

export async function createProjectAction(
  _prevState: unknown,
  input: { name: string; description?: string; initialMemberId?: string },
) {
  try {
    const { tenantId } = await verifySession()
    const project = await createProject({ name: input.name, description: input.description, tenantId })
    if (input.initialMemberId) {
      await addMember(project.id, input.initialMemberId)
      await setProjectManagerRole(input.initialMemberId, project.id, tenantId)
    }
    revalidatePath('/projetos')
    return { project }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error creating project' }
  }
}

export async function getProjectsAction() {
  try {
    const { tenantId } = await verifySession()
    return await findAllByTenant(tenantId)
  } catch {
    return []
  }
}

export async function getProjectAction(id: string) {
  try {
    await verifySession()
    const project = await findById(id)
    if (!project) {
      return { error: 'Project not found' }
    }
    return { project }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error fetching project' }
  }
}

export async function updateProjectAction(
  _prevState: unknown,
  id: string,
  data: UpdateProjectInput & { macroFases?: MacroFaseInput[] },
) {
  try {
    await verifySession()
    const project = await updateProject(id, data)
    revalidatePath('/projetos')
    revalidatePath(`/projetos/${id}`)
    return { project }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error updating project' }
  }
}

export async function deleteProjectAction(id: string) {
  try {
    await verifySession()
    await deleteProject(id)
    revalidatePath('/projetos')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error deleting project' }
  }
}

export async function addMemberAction(projectId: string, userId: string) {
  try {
    await verifySession()
    await addMember(projectId, userId)
    revalidatePath(`/projetos/${projectId}/membros`)
    revalidatePath(`/projetos/${projectId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error adding member' }
  }
}

export async function removeMemberAction(projectId: string, userId: string) {
  try {
    await verifySession()
    await removeMember(projectId, userId)
    revalidatePath(`/projetos/${projectId}/membros`)
    revalidatePath(`/projetos/${projectId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error removing member' }
  }
}

export async function getMembersAction(projectId: string) {
  try {
    await verifySession()
    return await getMembersWithDetails(projectId)
  } catch {
    return []
  }
}

export async function updateUserProjectAction(
  userId: string,
  projectId: string,
  data: {
    projectRole?: string
    roles?: string[]
    departments?: string[]
    hourlyRate?: number | null
    active?: boolean
  },
) {
  try {
    const { tenantId } = await verifySession()
    const member = await updateUserProject(userId, projectId, { ...data, tenantId })
    revalidatePath(`/projetos/${projectId}/membros`)
    revalidatePath(`/projetos/${projectId}`)
    revalidatePath('/admin/users')
    return { member }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error updating member' }
  }
}

export async function getUserProjectsAction(userId: string) {
  try {
    await verifySession()
    const rows = await getUserProjectsWithDetails(userId)
    return rows.map(r => ({
      ...r,
      startDate: r.startDate.toISOString(),
      endDate: r.endDate?.toISOString() ?? null,
    }))
  } catch {
    return []
  }
}
