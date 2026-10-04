'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { requireProjectPermission } from '@/services/projectAccess'
import prisma from '@/lib/prisma'
import {
  associarDepartamento,
  desassociarDepartamento,
  associarFuncao,
  desassociarFuncao,
} from '@/services/projetoCadastroService'
import { registrarAcao } from '@/services/auditoriaService'

async function authorize(tenantId: string, userId: string, role: string, projetoId: string) {
  await requireProjectPermission({ tenantId, userId, role }, projetoId, 'cadastros:gerenciar')
}

export async function associarDepartamentoAction(projetoId: string, departmentId: string) {
  try {
    const session = await verifySession()
    await authorize(session.tenantId, session.userId, session.role, projetoId)
    if (!(await prisma.department.findFirst({ where: { id: departmentId, tenantId: session.tenantId, deletedAt: null }, select: { id: true } }))) throw new Error('Cadastro não encontrado')
    await associarDepartamento(projetoId, departmentId)
    await registrarAcao({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'associar_departamento',
      entity: 'Project',
      entityId: projetoId,
      details: { departmentId },
    })
    revalidatePath(`/projetos/${projetoId}/departamentos`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao associar departamento' }
  }
}

export async function desassociarDepartamentoAction(projetoId: string, departmentId: string) {
  try {
    const session = await verifySession()
    await authorize(session.tenantId, session.userId, session.role, projetoId)
    if (!(await prisma.department.findFirst({ where: { id: departmentId, tenantId: session.tenantId, deletedAt: null }, select: { id: true } }))) throw new Error('Cadastro não encontrado')
    await desassociarDepartamento(projetoId, departmentId)
    await registrarAcao({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'desassociar_departamento',
      entity: 'Project',
      entityId: projetoId,
      details: { departmentId },
    })
    revalidatePath(`/projetos/${projetoId}/departamentos`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao desassociar departamento' }
  }
}

export async function associarFuncaoAction(projetoId: string, funcaoId: string) {
  try {
    const session = await verifySession()
    await authorize(session.tenantId, session.userId, session.role, projetoId)
    if (!(await prisma.role.findFirst({ where: { id: funcaoId, tenantId: session.tenantId, deletedAt: null }, select: { id: true } }))) throw new Error('Cadastro não encontrado')
    await associarFuncao(projetoId, funcaoId)
    await registrarAcao({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'associar_funcao',
      entity: 'Project',
      entityId: projetoId,
      details: { funcaoId },
    })
    revalidatePath(`/projetos/${projetoId}/funcoes`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao associar função' }
  }
}

export async function desassociarFuncaoAction(projetoId: string, funcaoId: string) {
  try {
    const session = await verifySession()
    await authorize(session.tenantId, session.userId, session.role, projetoId)
    if (!(await prisma.role.findFirst({ where: { id: funcaoId, tenantId: session.tenantId, deletedAt: null }, select: { id: true } }))) throw new Error('Cadastro não encontrado')
    await desassociarFuncao(projetoId, funcaoId)
    await registrarAcao({
      tenantId: session.tenantId,
      userId: session.userId,
      action: 'desassociar_funcao',
      entity: 'Project',
      entityId: projetoId,
      details: { funcaoId },
    })
    revalidatePath(`/projetos/${projetoId}/funcoes`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao desassociar função' }
  }
}
