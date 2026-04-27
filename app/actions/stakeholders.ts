'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { stakeholdersApi } from '@/lib/api-client'

interface StakeholderInput {
  name: string
  company?: string
  competence?: string
  email?: string
  phone?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  notes?: string
  logoUrl?: string
}

export async function createStakeholderAction(data: StakeholderInput, projectId?: string) {
  try {
    await verifySession()
    const stakeholder = await stakeholdersApi.create(data as unknown as Record<string, unknown>)
    if (projectId) {
      await stakeholdersApi.linkProject((stakeholder as { id: string }).id, projectId)
      revalidatePath(`/projetos/${projectId}/stakeholders`)
    }
    return { success: true, stakeholder }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar stakeholder.' }
  }
}

export async function updateStakeholderAction(stakeholderId: string, data: StakeholderInput, projectId: string) {
  try {
    await verifySession()
    const stakeholder = await stakeholdersApi.update(stakeholderId, data as unknown as Record<string, unknown>)
    revalidatePath(`/projetos/${projectId}/stakeholders`)
    return { success: true, stakeholder }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar stakeholder.' }
  }
}

export async function bindStakeholderAction(projectId: string, stakeholderId: string) {
  try {
    await verifySession()
    await stakeholdersApi.linkProject(stakeholderId, projectId)
    revalidatePath(`/projetos/${projectId}/stakeholders`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao vincular stakeholder ao projeto.' }
  }
}

export async function unbindStakeholderAction(projectId: string, stakeholderId: string) {
  try {
    await verifySession()
    await stakeholdersApi.unlinkProject(stakeholderId, projectId)
    revalidatePath(`/projetos/${projectId}/stakeholders`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover stakeholder do projeto.' }
  }
}
