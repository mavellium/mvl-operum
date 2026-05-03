'use server'

import { PutObjectCommand } from '@aws-sdk/client-s3'
import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { stakeholdersApi, projectsApi } from '@/lib/api-client'
import { s3, BUCKET, publicUrl } from '@/lib/minio'
import prisma from '@/lib/prisma'

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

export async function reorderStakeholdersAction(projectId: string, orderedIds: string[]) {
  try {
    await verifySession()
    await stakeholdersApi.reorderByProject(projectId, orderedIds)
    revalidatePath(`/projetos/${projectId}/stakeholders`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao reordenar stakeholders.' }
  }
}

export async function reorderMembersAction(projectId: string, orderedUserIds: string[]) {
  try {
    await verifySession()
    await projectsApi.reorderMembers(projectId, orderedUserIds)
    revalidatePath(`/projetos/${projectId}/stakeholders`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao reordenar membros.' }
  }
}

const SIGNATURE_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg']
const SIGNATURE_MAX_BYTES = 2 * 1024 * 1024

export async function uploadMemberSignatureAction(formData: FormData, userId: string) {
  try {
    const { role, userId: callerId } = await verifySession()
    if (role !== 'admin' && callerId !== userId) {
      return { error: 'Não autorizado' }
    }

    const file = formData.get('file') as File
    if (!file || file.size === 0) return { error: 'Arquivo inválido' }
    if (!SIGNATURE_ALLOWED_TYPES.includes(file.type)) return { error: 'Apenas PNG e JPEG são aceitos' }
    if (file.size > SIGNATURE_MAX_BYTES) return { error: 'Arquivo excede 2 MB' }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
    const key = `signatures/${userId}/signature-${Date.now()}.${ext}`

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
      }),
    )

    const signatureUrl = publicUrl(key)
    await prisma.user.update({ where: { id: userId }, data: { signatureUrl } })
    return { signatureUrl }
  } catch (err) {
    console.error('[uploadMemberSignatureAction]', err)
    return { error: err instanceof Error ? err.message : 'Erro ao fazer upload da assinatura' }
  }
}
