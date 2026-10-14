import 'server-only'
import { can, type SessaoAuthz } from './authz'
import { sincronizarEapComSprint, type SyncEapSprintResult } from './wbsService'
import { propagarPlanilhaDeCustos } from './planilhaService'

/**
 * Sincroniza EAP/planilha e sprint ao abrir as telas que as exibem e leva as datas
 * e custos da planilha para fases, sprints e projeto. Só roda para
 * quem pode editar o projeto e os cards; falha de sincronização nunca derruba a página.
 */
export async function sincronizarEapSprintSePermitido(sessao: SessaoAuthz, projectId: string): Promise<SyncEapSprintResult | null> {
  try {
    if (!(await can(sessao, projectId, 'projeto:editar')) || !(await can(sessao, projectId, 'quadro:cards'))) return null
    const result = await sincronizarEapComSprint(projectId, sessao.tenantId)
    // Datas e custos da planilha → fases (cronograma financeiro), sprints e projeto.
    await propagarPlanilhaDeCustos(projectId, sessao.tenantId)
    return result
  } catch (error) {
    console.error('[eap-sprint] falha ao sincronizar', error)
    return null
  }
}
