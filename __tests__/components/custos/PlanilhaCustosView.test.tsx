import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import PlanilhaCustosView from '@/components/custos/PlanilhaCustosView'
import { ToastProvider } from '@/components/ui/Toast'
import type { PlanilhaDeCustos, Elaborador } from '@/lib/planilhaCustos'

vi.mock('@/app/actions/wbs', () => ({
  updateNodePropertiesAction: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('@/app/actions/projetos', () => ({
  addMemberAction: vi.fn(),
}))

beforeEach(() => vi.clearAllMocks())

const elaboradores: Elaborador[] = [
  { userId: 'u1', name: 'Maria', remuneracao: 4000, horasDiarias: 8 },
]

const planilha: PlanilhaDeCustos = {
  config: { valorReferencia: 4000, horasPorDia: 8 },
  macrofases: [
    {
      nodeId: 'mf1', codigo: 'M1', titulo: 'Fase 1',
      atividades: [
        {
          nodeId: 'a1', codigo: 'A1', titulo: 'Atividade 1',
          elaboradoPor: 'Maria', elaboradoPorUserId: 'u1',
          vpm: 1, jornadaDiaria: 8,
          minOrcado: 90, materiaisOrcado: 0, dataPrevista: null,
          rOrcado: 90, totalOrcado: 90,
          minReal: 0, materiaisReal: 0, dataRealizacao: null,
          rReal: 0, totalReal: 0,
          situacao: 'Pendente',
        },
      ],
      minOrcado: 90, materiaisOrcado: 0, totalOrcado: 90,
      minReal: 0, materiaisReal: 0, totalReal: 0,
    },
  ],
  qtdeAtividades: 1,
  totalOrcado: 90,
  totalReal: 0,
  tempoOrcadoTotal: 90,
  tempoRealTotal: 0,
  quadros: {
    valor: [{ fase: 'M1', orcado: 90, realizado: 0 }],
    tempo: [{ fase: 'M1', minOrcado: 90, minReal: 0 }],
    elaboradores: [{ elaborador: 'Maria', qtdeAtividades: 1, percentual: 100 }],
  },
}

const props = {
  projetoId: 'p1',
  nomeProjeto: 'Projeto Teste',
  inicioProjeto: '01/01/2026',
  fimProjeto: '01/03/2026',
  canEdit: true,
  planilha,
  elaboradores,
  usuariosDisponiveis: [],
  exportUrl: '/api/export?p=p1',
}

function renderizar() {
  return render(
    <ToastProvider>
      <PlanilhaCustosView {...props} />
    </ToastProvider>
  )
}

describe('PlanilhaCustosView — edição Min/Horas/Dias', () => {
  it('digitar em Horas não corta: mantém o texto bruto e converte ao vivo', () => {
    renderizar()
    const horas = screen.getByDisplayValue('1:30') // hhmm(90)
    const min = screen.getByDisplayValue('90')

    fireEvent.focus(horas)
    fireEvent.change(horas, { target: { value: '2' } })
    expect(horas).toHaveValue('2') // texto bruto, NÃO vira "2:00"
    expect(min).toHaveValue('120') // conversão ao vivo em minutos

    fireEvent.change(horas, { target: { value: '2.' } })
    expect(horas).toHaveValue('2.') // o "." não é cortado pela re-derivação

    fireEvent.change(horas, { target: { value: '2.5' } })
    expect(horas).toHaveValue('2.5')
    expect(min).toHaveValue('150')

    fireEvent.blur(horas)
    expect(horas).toHaveValue('2:30') // normaliza para hh:mm após sair do campo
    expect(min).toHaveValue('150')
  })

  it('digitar em Horas aceita h:mm e atualiza Min', () => {
    renderizar()
    const horas = screen.getByDisplayValue('1:30')

    fireEvent.focus(horas)
    fireEvent.change(horas, { target: { value: '5:' } })
    expect(horas).toHaveValue('5:') // parcial inválida não quebra o texto
    fireEvent.change(horas, { target: { value: '5:3' } })
    fireEvent.change(horas, { target: { value: '5:30' } })
    expect(horas).toHaveValue('5:30')
    expect(screen.getByDisplayValue('330')).toBeInTheDocument()
  })

  it('digitar em Dias converte para Min e Horas (usando a jornada da linha)', () => {
    renderizar()
    const dias = screen.getByDisplayValue('0,19') // dois(90/60/8)

    fireEvent.focus(dias)
    fireEvent.change(dias, { target: { value: '1' } })
    expect(dias).toHaveValue('1') // texto bruto, NÃO vira "1,00"
    expect(screen.getByDisplayValue('480')).toBeInTheDocument()
    expect(screen.getByDisplayValue('8:00')).toBeInTheDocument()

    fireEvent.change(dias, { target: { value: '1.5' } })
    expect(dias).toHaveValue('1.5')
    expect(screen.getByDisplayValue('720')).toBeInTheDocument()

    fireEvent.blur(dias)
    expect(dias).toHaveValue('1,50')
    expect(screen.getByDisplayValue('720')).toBeInTheDocument()
  })

  it('auto-save não corta a digitação em andamento', async () => {
    vi.useFakeTimers()
    try {
      renderizar()
      const horas = screen.getByDisplayValue('1:30')

      fireEvent.focus(horas)
      fireEvent.change(horas, { target: { value: '2.' } })
      expect(horas).toHaveValue('2.')

      // dispara o debounce do auto-save (1s) — re-render de setSalvando/setSalvo
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100)
      })

      expect(horas).toHaveValue('2.') // o draft sobrevive ao re-render do auto-save
      expect(screen.getByDisplayValue('120')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('sub-total acompanha a edição ainda não salva (rascunho) em Min/Total', () => {
    renderizar()
    const sub = screen.getByText('M1 Sub-total Fase 1').closest('tr')!

    // estado inicial (vpm=1, jornada 8): min 90 → 1:30h, 0,19d, R$ 90,00
    expect(sub).toHaveTextContent('90')
    expect(sub).toHaveTextContent('1:30')
    expect(sub).toHaveTextContent('0,19')
    expect(sub).toHaveTextContent('R$ 90,00')

    // edita Min na linha (90 → 120): sub-total reflete na hora, sem salvar
    fireEvent.change(screen.getByDisplayValue('90'), { target: { value: '120' } })
    expect(sub).toHaveTextContent('120')
    expect(sub).toHaveTextContent('2:00')
    expect(sub).toHaveTextContent('0,25')
    expect(sub).toHaveTextContent('R$ 120,00')
  })

  it('sub-total mostra "—" quando nenhuma linha da fase tem elaborador/jornada', () => {
    const semElaborador: PlanilhaDeCustos = {
      ...planilha,
      macrofases: [
        {
          ...planilha.macrofases[0],
          atividades: [
            {
              ...planilha.macrofases[0].atividades[0],
              elaboradoPor: '', elaboradoPorUserId: null, vpm: null, jornadaDiaria: null,
              rOrcado: null, totalOrcado: null, rReal: null, totalReal: null,
            },
          ],
        },
      ],
      totalOrcado: 0,
      totalReal: 0,
      quadros: { valor: [{ fase: 'M1', orcado: 0, realizado: 0 }], tempo: planilha.quadros.tempo, elaboradores: [] },
    }
    render(
      <ToastProvider>
        <PlanilhaCustosView {...props} planilha={semElaborador} />
      </ToastProvider>
    )

    const sub = screen.getByText('M1 Sub-total Fase 1').closest('tr')!
    // dias e R$/Total sem valor → "—" (nenhum), mas Min/Horas continuam somando
    expect(sub).toHaveTextContent('90')
    expect(sub).toHaveTextContent('1:30')
    expect(sub).toHaveTextContent('—')
  })
})

describe('PlanilhaCustosView — situação ao vivo', () => {
  function renderizarDatas(prevista: string | null, realizacao: string | null) {
    const p: PlanilhaDeCustos = {
      ...planilha,
      macrofases: [{
        ...planilha.macrofases[0],
        atividades: [{
          ...planilha.macrofases[0].atividades[0],
          dataPrevista: prevista,
          dataRealizacao: realizacao,
        }],
      }],
    }
    return render(
      <ToastProvider>
        <PlanilhaCustosView {...props} planilha={p} />
      </ToastProvider>
    )
  }

  it('sem realização → Pendente', () => {
    renderizarDatas('2026-03-10', null)
    expect(screen.getByText('Pendente')).toBeInTheDocument()
  })

  it('realização antes da prevista → Antecipada (verde)', () => {
    renderizarDatas('2026-03-10', '2026-03-05')
    expect(screen.getByText('Antecipada')).toBeInTheDocument()
  })

  it('realização após a prevista → Atrasada (vermelho)', () => {
    renderizarDatas('2026-03-10', '2026-03-15')
    expect(screen.getByText('Atrasada')).toBeInTheDocument()
  })

  it('atualiza a situação ao vivo enquanto digita as datas', () => {
    const { container } = renderizarDatas(null, null)

    // Inicial: sem realização → Pendente
    expect(screen.getByText('Pendente')).toBeInTheDocument()

    // Digita prevista 10/03/2026 e realização 15/03/2026 → Atrasada ao vivo
    const inputs = Array.from(container.querySelectorAll('input'))
    const previstaInput = inputs.find(i => i.placeholder === 'dd/mm/aaaa')!
    const realizacaoInput = inputs.find(i => i.placeholder === 'dd/mm/aaaa' && i !== previstaInput)!
    fireEvent.change(previstaInput, { target: { value: '10/03/2026' } })
    fireEvent.change(realizacaoInput, { target: { value: '15/03/2026' } })
    expect(screen.getByText('Atrasada')).toBeInTheDocument()

    // Trocando a realização para antes → Antecipada sem salvar
    fireEvent.change(realizacaoInput, { target: { value: '05/03/2026' } })
    expect(screen.getByText('Antecipada')).toBeInTheDocument()

    // Limpando a realização → volta para Pendente
    fireEvent.change(realizacaoInput, { target: { value: '' } })
    expect(screen.getByText('Pendente')).toBeInTheDocument()
  })
})