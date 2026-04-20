'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { verifySession } from '@/lib/dal'

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

// 1. Criar novo Stakeholder Global (e opcionalmente já vincular ao projeto)
export async function createStakeholderAction(data: StakeholderInput, projectId?: string) {
  const { tenantId, role } = await verifySession()
  
  if (role !== 'admin') {
    return { error: 'Apenas administradores podem criar novos stakeholders.' }
  }

  try {
    const stakeholder = await prisma.stakeholder.create({
      data: {
        tenantId,
        name: data.name,
        company: data.company,
        competence: data.competence,
        email: data.email,
        phone: data.phone,
        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado,
        notes: data.notes,
        logoUrl: data.logoUrl,
        isActive: true,
      }
    })

    // Se a criação foi feita dentro da tela de um projeto, já faz o vínculo automático
    if (projectId) {
      await prisma.projectStakeholder.create({
        data: { projectId, stakeholderId: stakeholder.id }
      })
      revalidatePath(`/projetos/${projectId}/stakeholders`)
    }

    return { success: true, stakeholder }
  } catch (error) {
    console.error(error)
    return { error: 'Erro ao criar stakeholder.' }
  }
}

// 2. Atualizar dados globais de um Stakeholder
export async function updateStakeholderAction(stakeholderId: string, data: StakeholderInput, projectId: string) {
  const { role } = await verifySession()
  
  if (role !== 'admin') {
    return { error: 'Apenas administradores podem editar stakeholders.' }
  }

  try {
    const stakeholder = await prisma.stakeholder.update({
      where: { id: stakeholderId },
      data: {
        name: data.name,
        company: data.company,
        competence: data.competence,
        email: data.email,
        phone: data.phone,
        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado,
        notes: data.notes,
        logoUrl: data.logoUrl,
      }
    })

    revalidatePath(`/projetos/${projectId}/stakeholders`)
    return { success: true, stakeholder }
  } catch (error) {
    console.error(error)
    return { error: 'Erro ao atualizar stakeholder.' }
  }
}

// 3. Vincular um Stakeholder existente ao Projeto
export async function bindStakeholderAction(projectId: string, stakeholderId: string) {
  const { role } = await verifySession()
  
  if (role !== 'admin') {
    return { error: 'Apenas administradores podem vincular stakeholders.' }
  }

  try {
    await prisma.projectStakeholder.create({
      data: { projectId, stakeholderId }
    })

    revalidatePath(`/projetos/${projectId}/stakeholders`)
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: 'Erro ao vincular stakeholder ao projeto.' }
  }
}

// 4. Desvincular um Stakeholder do Projeto
export async function unbindStakeholderAction(projectId: string, stakeholderId: string) {
  const { role } = await verifySession()
  
  if (role !== 'admin') {
    return { error: 'Apenas administradores podem remover stakeholders do projeto.' }
  }

  try {
    await prisma.projectStakeholder.delete({
      where: {
        projectId_stakeholderId: { projectId, stakeholderId }
      }
    })

    revalidatePath(`/projetos/${projectId}/stakeholders`)
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: 'Erro ao remover stakeholder do projeto.' }
  }
}