'use server'

import { verifySession } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import { projectsApi, adminApi } from '@/lib/api-client'

export async function createProjetoAction(
  _prevState: unknown,
  input: {
    name: string
    description?: string
    initialMemberId?: string
    startDate?: string
    endDate?: string
    location?: string
    logoUrl?: string
    slogan?: string
    justificativa?: string
    objetivos?: string
    metodologia?: string
    descricaoProduto?: string
    premissas?: string
    restricoes?: string
    limitesAutoridade?: string
    semestre?: string
    ano?: string
    departamentos?: string[]
    macroFases?: Array<{ fase: string; dataLimite: string; custo: string }>
  },
) {
  try {
    const { tenantId } = await verifySession()
    const { initialMemberId, ano: anoStr, macroFases, startDate, endDate, ...rest } = input
    const ano = anoStr ? Number(anoStr) : undefined
    const toISO = (d?: string) => d ? new Date(d).toISOString() : undefined

    const projeto = await projectsApi.create({
      ...rest,
      tenantId,
      ano,
      startDate: toISO(startDate),
      endDate: toISO(endDate),
    }) as Record<string, unknown>

    if (initialMemberId) {
      await projectsApi.addMember(projeto.id as string, { userId: initialMemberId })
    }

    if (macroFases && macroFases.length > 0) {
      await projectsApi.upsertMacroFases(projeto.id as string, macroFases)
    }

    revalidatePath('/projetos')
    return { projeto }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar projeto' }
  }
}

export async function getProjetosAction(): Promise<{ id: string; name: string }[]> {
  try {
    const result = await projectsApi.list()
    return result.items
  } catch {
    return []
  }
}

export async function getProjetoAction(id: string) {
  try {
    await verifySession()
    const projeto = await projectsApi.get(id)
    if (!projeto) return { error: 'Projeto não encontrado' }
    return { projeto }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao buscar projeto' }
  }
}

export async function updateProjetoAction(
  _prevState: unknown,
  id: string,
  data: Record<string, unknown> & { ano?: string | number; macroFases?: Array<{ fase: string; dataLimite: string; custo: string }> },
) {
  try {
    await verifySession()
    const { ano: anoRaw, macroFases, startDate, endDate, ...rest } = data
    const ano = anoRaw !== undefined && anoRaw !== '' ? Number(anoRaw) : undefined
    const toISO = (d: unknown) => (typeof d === 'string' && d) ? new Date(d).toISOString() : undefined
    const projeto = await projectsApi.update(id, {
      ...rest,
      ...(ano !== undefined && { ano }),
      ...(startDate !== undefined && { startDate: toISO(startDate) }),
      ...(endDate !== undefined && { endDate: toISO(endDate) }),
    })

    if (macroFases) {
      await projectsApi.upsertMacroFases(id, macroFases)
    }

    revalidatePath('/projetos')
    revalidatePath(`/projetos/${id}`)
    return { projeto }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar projeto' }
  }
}

export async function deleteProjetoAction(id: string) {
  try {
    await verifySession()
    await projectsApi.delete(id)
    revalidatePath('/projetos')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao deletar projeto' }
  }
}

export async function addMemberAction(projetoId: string, userId: string) {
  try {
    await verifySession()
    await projectsApi.addMember(projetoId, { userId })
    revalidatePath(`/projetos/${projetoId}/membros`)
    revalidatePath(`/projetos/${projetoId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao adicionar membro' }
  }
}

export async function removeMemberAction(projetoId: string, userId: string) {
  try {
    await verifySession()
    await projectsApi.removeMember(projetoId, userId)
    revalidatePath(`/projetos/${projetoId}/membros`)
    revalidatePath(`/projetos/${projetoId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao remover membro' }
  }
}

export async function getMembrosAction(projetoId: string) {
  try {
    await verifySession()
    return await projectsApi.getMembers(projetoId)
  } catch {
    return []
  }
}

export async function updateUsuarioProjetoAction(
  userId: string,
  projetoId: string,
  data: {
    projectRole?: string
    cargos?: string[]
    departamentos?: string[]
    hourlyRate?: number | null
    active?: boolean
  },
) {
  try {
    const { tenantId } = await verifySession()
    await projectsApi.addMember(projetoId, { userId, ...data, tenantId })
    revalidatePath(`/projetos/${projetoId}/membros`)
    revalidatePath(`/projetos/${projetoId}`)
    revalidatePath('/admin/users')
    return { membro: { userId, projetoId } }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar membro' }
  }
}

export async function updateProjetoMemberAction(
  userId: string,
  projetoId: string,
  data: {
    phone?: string
    cep?: string
    logradouro?: string
    numero?: string
    complemento?: string
    bairro?: string
    cidade?: string
    estado?: string
    notes?: string
    hourlyRate?: number | string
    cargos?: string[]
    departamento?: string[]
    isGerente?: boolean
  },
) {
  try {
    await verifySession()
    const { isGerente, cargos, departamento, hourlyRate: rawRate, ...profileData } = data

    let hourlyRate: number | undefined
    if (rawRate !== undefined) {
      const n = typeof rawRate === 'string'
        ? parseFloat(rawRate.replace(/\./g, '').replace(',', '.'))
        : rawRate
      if (!isNaN(n)) hourlyRate = n
    }

    // Update user global profile
    await adminApi.updateUser(userId, {
      ...profileData,
      ...(hourlyRate !== undefined && { hourlyRate }),
      ...(cargos !== undefined && { cargo: cargos.join(', ') }),
      ...(departamento !== undefined && { departamento: departamento[0] ?? null }),
    })

    // Update project membership
    await projectsApi.addMember(projetoId, {
      userId,
      ...(cargos !== undefined && { roles: cargos }),
      ...(departamento !== undefined && { departamento: departamento[0] }),
      ...(hourlyRate !== undefined && { hourlyRate }),
    })

    if (isGerente === true) {
      await projectsApi.assignProjectRole(projetoId, userId, 'GERENTE')
    } else if (isGerente === false) {
      await projectsApi.removeProjectRole(projetoId, userId).catch(() => {})
    }

    revalidatePath(`/projetos/${projetoId}/membros`)
    revalidatePath(`/projetos/${projetoId}`)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar membro' }
  }
}

export async function getUserProjetosAction(userId: string) {
  try {
    await verifySession()
    return await projectsApi.getUserProjects(userId)
  } catch {
    return []
  }
}
