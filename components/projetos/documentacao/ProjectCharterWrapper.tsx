'use client'

import ProjectCharter from './ProjectCharter'
import type { MembroEquipeOption } from './MembroEquipeSelect'

interface Props {
  /** Membros da equipe — responsáveis/aprovadores do Termo de Abertura */
  membros?: MembroEquipeOption[]
}

export default function ProjectCharterWrapper({ membros = [] }: Props) {
  return <ProjectCharter membros={membros} />
}