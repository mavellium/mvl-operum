export interface DerivadosInput {
  minutos: number
  horasDiarias: number
  remuneracao: number
}

export interface DerivadosResult {
  horas: number
  dias: number
  valorPorMinuto: number
  total: number
}

export function calcularDerivados(input: DerivadosInput): DerivadosResult {
  const { minutos, horasDiarias, remuneracao } = input

  if (horasDiarias === 0) {
    return { horas: minutos / 60, dias: 0, valorPorMinuto: 0, total: 0 }
  }

  const horas = minutos / 60
  const dias = horas / horasDiarias
  const valorPorMinuto = remuneracao / (horasDiarias * 60)
  const total = minutos * valorPorMinuto

  return { horas, dias, valorPorMinuto, total }
}

export type SituacaoStatus = 'Antecipada' | 'No prazo' | 'Atrasada'

export function calcularSituacaoStatus(
  dataRealizacao: Date | null | undefined,
  dataPrevista: Date | null | undefined
): SituacaoStatus | null {
  if (!dataRealizacao || !dataPrevista) return null

  const realMs = dataRealizacao.setHours(0, 0, 0, 0)
  const prevMs = new Date(dataPrevista).setHours(0, 0, 0, 0)

  if (realMs < prevMs) return 'Antecipada'
  if (realMs === prevMs) return 'No prazo'
  return 'Atrasada'
}
