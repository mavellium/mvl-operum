'use server'

import { verifySession } from '@/lib/dal'
import { createDepartamento, findAllByTenant, updateDepartamento, deactivate } from '@/services/departamentoService'

export async function createDepartamentoAction(
  _prevState: unknown,
  input: { nome: string; descricao?: string; valorHora?: number },
) {
  try {
    const { tenantId } = await verifySession()
    const departamento = await createDepartamento({ ...input, tenantId })
    return { departamento }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao criar departamento' }
  }
}

export async function getDepartamentosAction() {
  try {
    const { tenantId } = await verifySession()
    return await findAllByTenant(tenantId)
  } catch {
    return []
  }
}

export async function updateDepartamentoAction(_prevState: unknown, id: string, data: Record<string, unknown>) {
  try {
    await verifySession()
    const departamento = await updateDepartamento(id, data)
    return { departamento }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao atualizar departamento' }
  }
}

export async function deactivateDepartamentoAction(id: string) {
  try {
    await verifySession()
    await deactivate(id)
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erro ao desativar departamento' }
  }
}
