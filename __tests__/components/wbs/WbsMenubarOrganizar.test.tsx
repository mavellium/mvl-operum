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
const no = (id: string, parentId: string | null, layout: WbsNodeClient['layout'], childrenIds: string[] = []): WbsNodeClient =>
  ({ id, parentId, order: 0, code: '', title: id, layout, collapsed: false, style: S, properties: {}, childrenIds })
const arvore = (formato: WbsNodeClient['layout'] = 'DIREITA') => ({
  r: no('r', null, formato, ['f1']),
  f1: no('f1', 'r', 'LADO_A_LADO', ['a']),
  a: no('a', 'f1', 'LADO_A_LADO'),
})

function renderBar(over: Partial<WbsMenubarProps> = {}) {
  const dispatch = vi.fn()
  const onChangeView = vi.fn()
  render(
    <WbsMenubar
      syncStatus="IDLE" lastSavedAt={null} zoom={1} panX={0} panY={0}
      canUndo={false} canRedo={false} canEdit
      nodes={arvore()} rootId="r" selectedNodeIds={['r']} projetoId="p1"
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
  it('mostra o formato da EAP e lista Padrão, Esquerda, Direita e Horizontal, sem topo e base', async () => {
    renderBar()
    await userEvent.click(screen.getByRole('button', { name: 'Organizar: Direita' }))
    const lista = screen.getByRole('listbox', { name: 'Organizar' })
    expect(within(lista).getAllByRole('option').map(o => o.textContent?.replace('✓', '').trim())).toEqual([
      'Padrão', 'Esquerda', 'Direita', 'Horizontal',
    ])
    expect(within(lista).getByRole('option', { name: /Direita/ })).toHaveAttribute('aria-selected', 'true')
    expect(within(lista).queryByText(/topo|base|Abaixo/)).toBeNull()
    expect(within(lista).getAllByRole('option').every(o => o.querySelector('svg'))).toBe(true)
  })

  it('o formato vale para a EAP inteira, qualquer que seja o item selecionado', async () => {
    const { dispatch } = renderBar({ selectedNodeIds: ['a'] })
    await userEvent.click(screen.getByRole('button', { name: 'Organizar: Direita' }))
    await userEvent.click(screen.getByRole('option', { name: /Horizontal/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LAYOUT', payload: { nodeId: 'r', layout: 'HORIZONTAL' } })
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('funciona sem item selecionado', () => {
    renderBar({ selectedNodeIds: [] })
    expect(screen.getByRole('button', { name: 'Organizar: Direita' })).toBeEnabled()
  })

  it('sem permissão de edição fica desabilitado', () => {
    renderBar({ canEdit: false })
    expect(screen.getByRole('button', { name: 'Organizar: Direita' })).toBeDisabled()
  })

  it('teclado: seta para baixo e Enter escolhem; Esc fecha sem escolher', async () => {
    const { dispatch } = renderBar()
    const botao = screen.getByRole('button', { name: 'Organizar: Direita' })
    botao.focus()
    fireEvent.keyDown(botao, { key: 'ArrowDown' })
    const lista = screen.getByRole('listbox')
    fireEvent.keyDown(lista, { key: 'ArrowDown' })
    fireEvent.keyDown(lista, { key: 'Enter' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LAYOUT', payload: { nodeId: 'r', layout: 'HORIZONTAL' } })

    fireEvent.keyDown(botao, { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(dispatch).toHaveBeenCalledTimes(1)
  })
})

describe('menu Fase da EAP', () => {
  it('só com uma fase selecionada; fora disso pede para selecionar uma fase', () => {
    renderBar({ selectedNodeIds: ['a'] })
    expect(screen.getByRole('button', { name: 'Fase: Selecione uma fase' })).toBeDisabled()
  })

  it('fase selecionada: "Igual à EAP" por padrão; Esquerda vale só para ela', async () => {
    const { dispatch } = renderBar({ selectedNodeIds: ['f1'] })
    await userEvent.click(screen.getByRole('button', { name: 'Fase: Igual à EAP' }))
    const lista = screen.getByRole('listbox', { name: 'Fase' })
    expect(within(lista).getAllByRole('option').map(o => o.textContent?.replace('✓', '').trim())).toEqual(['Igual à EAP', 'Esquerda', 'Direita'])
    await userEvent.click(within(lista).getByRole('option', { name: /Esquerda/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_LAYOUT', payload: { nodeId: 'f1', layout: 'ESQUERDA' } })
  })

  it('no Horizontal não se aplica', () => {
    renderBar({ nodes: arvore('HORIZONTAL'), selectedNodeIds: ['f1'] })
    expect(screen.getByRole('button', { name: 'Fase: Não se aplica ao Horizontal' })).toBeDisabled()
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
