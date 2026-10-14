/**
 * Linha institucional do quadro dos documentos (Ata, EAP), no formato do modelo
 * do professor: "Localização - Departamentos - termo - Período Ano"
 * (ex.: "Fatec Garça - Gestão Empresarial - 5° termo Noturno - 1° Semestre 2025").
 * Todos os campos vêm de Editar projeto > Informações iniciais.
 */

/** O Operum ainda não cadastra o termo/turno do projeto. */
export const TERMO_A_DEFINIR = 'A definir no Operum (ex: 5° termo Noturno)'

export interface ProjetoInstitucional {
  location?: string | null
  departamentos?: string[] | null
  semestre?: string | null
  ano?: number | null
}

/** Período + ano: "1° Semestre 2025"; período anual vira só o ano. */
export function periodoDoProjeto(semestre?: string | null, ano?: number | null): string {
  const periodo = semestre === '1' ? '1° Semestre' : semestre === '2' ? '2° Semestre' : semestre === 'ano' ? '' : (semestre ?? '').trim()
  return [periodo, ano ? String(ano) : ''].filter(Boolean).join(' ')
}

export function linhaInstitucional(p: ProjetoInstitucional): string {
  const departamentos = (p.departamentos ?? []).map(d => d.trim()).filter(Boolean).join(' / ')
  return [p.location?.trim(), departamentos, TERMO_A_DEFINIR, periodoDoProjeto(p.semestre, p.ano)].filter(Boolean).join(' - ')
}
