import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WbsMenubar, { type WbsMenubarProps } from '@/components/wbs/WbsMenubar'
import type { WbsNodeClient } from '@/types/wbs'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }))
vi.mock('@/app/actions/wbs', () => ({ importWbsAction: vi.fn(), getWbsTreeAction: vi.fn() }))
vi.mock('@/lib/wbsExportSvg', () => ({ exportWbsSvg: vi.fn(), exportWbsPng: vi.fn() }))
vi.mock('@/lib/wbsExportMspdi', () => ({ exportMspdi: vi.fn() }))

const S = { backgroundColor: '#fff', borderColor: '#000', textColor: '#000', borderWidth: 1, fontSize: 14, borderRadius: 4 }
const r: WbsNodeClient = { id: 'r', parentId: null, order: 0, code: '1', title: 'Operum', layout: 'DIREITA', collapsed: false, style: S, properties: {}, childrenIds: [] }

function renderBar(over: Partial<WbsMenubarProps> = {}) {
  const dispatch = vi.fn()
  const onChangeView = vi.fn()
  render(
    <WbsMenubar
      syncStatus="IDLE" lastSavedAt={null} zoom={1} panX={0} panY={0}
      canUndo={false} canRedo={false} canEdit
      nodes={{ r }} rootId="r" selectedNodeIds={['r']} projetoId="p1"
      dispatch={dispatch} hasCopiedStyle={false} hasClipboardNodes={false}
      onFitScreen={vi.fn()} onManualSave={vi.fn()} onRequestDelete={vi.fn()} onPasteStyle={vi.fn()}
      showStylePanel={false} onToggleStylePanel={vi.fn()}
      viewMode="chart" onChangeView={onChangeView} canViewCosts={false}
      {...over}
    />,
  )
  return { dispatch, onChangeView }
}

describe('menu Organizar da EAP', () => {
  it('mostra o layout atual e lista os 6 ícones, sem "Abaixo"', async () => {
    renderBar()
    const botao = screen.getByRole('button', { name: 'Organizar: Direita' })
    await userEvent.click(botao)
    const lista = screen.getByRole('listbox', { name: 'Organizar' })
    expect(within(lista).getAllByRole('option').map(o => o.textContent?.replace('✓', '').trim())).toEqual([
      'Padrão', 'Direita', 'Esquerda', 'Horizontal', 'Horizontal (topo)', 'Horizontal (base)',
    ])
    expect(within(lista).getByRole('option', { name: /Direita/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(lista).queryByText(/Abaixo/)).toBeNull()
    expect(within(lista).getAllByRole('option').every(o => o.querySelector('svg'))).toBe(true)
  })

  it('escolher um ícone aplica o layout aos filhos do item selecionado', async () => {
    const { dispatch } = renderBar()
    await userEvent.click(screen.getByRole('button', { name: 'Organizar: Direita' }))
    await userEvent.click(screen.getByRole('option', { name: /Horizontal \(topo\)/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LAYOUT', payload: { nodeId: 'r', layout: 'HORIZONTAL_TOPO' } })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('teclado: seta para baixo e Enter escolhem; Esc fecha sem escolher', async () => {
    const { dispatch } = renderBar()
    const botao = screen.getByRole('button', { name: 'Organizar: Direita' })
    botao.focus()
    fireEvent.keyDown(botao, { key: 'ArrowDown' })
    const lista = screen.getByRole('listbox')
    fireEvent.keyDown(lista, { key: 'ArrowDown' })
    fireEvent.keyDown(lista, { key: 'Enter' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LAYOUT', payload: { nodeId: 'r', layout: 'ESQUERDA' } })

    fireEvent.keyDown(botao, { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('sem item selecionado ou sem permissão de edição fica desabilitado', () => {
    renderBar({ selectedNodeIds: [] })
    expect(screen.getByRole('button', { name: 'Organizar: Selecione um item' })).toBeDisabled()
  })
})

describe('menu Visualização da EAP', () => {
  it('nomes em português, com ícone; Horas e custos desabilitado sem permissão', async () => {
    const { onChangeView } = renderBar()
    await userEvent.click(screen.getByRole('button', { name: 'Visualização: EAP (gráfico)' }))
    const lista = screen.getByRole('listbox', { name: 'Visualização' })
    expect(within(lista).getByRole('option', { name: /Horas e custos/ })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(within(lista).getByRole('option', { name: /Horas e custos/ }))
    expect(onChangeView).not.toHaveBeenCalled()
    await userEvent.click(within(lista).getByRole('option', { name: /Gantt/ }))
    expect(onChangeView).toHaveBeenCalledWith('gantt')
  })
})
