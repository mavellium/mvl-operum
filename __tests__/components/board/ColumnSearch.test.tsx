import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Column from '@/components/board/Column'
import type { Card as CardType } from '@/types/kanban'

const dropDisabled: boolean[] = []

vi.mock('@hello-pangea/dnd', () => ({
  Draggable: ({ children }: { children: (p: object, s: object) => React.ReactNode }) =>
    <>{children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }, { isDragging: false })}</>,
  Droppable: ({ children, isDropDisabled }: { children: (p: object, s: object) => React.ReactNode; isDropDisabled?: boolean }) => {
    dropDisabled.push(!!isDropDisabled)
    return <>{children({ innerRef: () => {}, droppableProps: {}, placeholder: null }, { isDraggingOver: false })}</>
  },
}))

vi.mock('@/components/permissoes/ProjectPermissions', () => ({
  useProjectPermissions: () => ({ has: () => true }),
}))

vi.mock('@/components/card/Card', () => ({
  default: ({ card, dragDisabled }: { card: CardType; dragDisabled?: boolean }) =>
    <div data-testid="card" data-drag-disabled={String(!!dragDisabled)}>{card.title}</div>,
}))

function card(id: string, title: string): CardType {
  return { id, title, description: '', color: '#6b7280', createdAt: 0, updatedAt: 0 }
}

function renderColumn() {
  return render(
    <Column
      column={{ id: 'col', title: 'A Fazer', cardIds: ['1', '2', '3'] }}
      cards={[card('1', 'Corrigir anexo'), card('2', 'Gráfico de Gantt'), card('3', 'Gantt do projeto')]}
      index={0}
      onAddCard={vi.fn()}
      onUpdateCard={vi.fn()}
      onDeleteCard={vi.fn()}
      onCardClick={vi.fn()}
    />,
  )
}

describe('busca na coluna', () => {
  it('a lupa abre o campo, filtra os cards e mostra encontrados/total', async () => {
    const user = userEvent.setup()
    renderColumn()
    expect(screen.queryByRole('searchbox')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Buscar na coluna A Fazer' }))
    const input = screen.getByRole('searchbox', { name: 'Buscar cards na coluna A Fazer' })
    expect(input).toHaveFocus()

    await user.type(input, 'gantt')
    expect(screen.getAllByTestId('card').map(c => c.textContent)).toEqual(['Gráfico de Gantt', 'Gantt do projeto'])
    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.getByText(/2 de 3 cards/)).toBeInTheDocument()
  })

  it('pausa o arraste da coluna enquanto há busca', async () => {
    const user = userEvent.setup()
    renderColumn()
    await user.click(screen.getByRole('button', { name: 'Buscar na coluna A Fazer' }))
    dropDisabled.length = 0
    await user.type(screen.getByRole('searchbox'), 'zzz')
    expect(dropDisabled.at(-1)).toBe(true)
    expect(screen.getByText('Nenhum card corresponde à busca')).toBeInTheDocument()
  })

  it('Escape limpa e fecha, devolvendo todos os cards arrastáveis', async () => {
    const user = userEvent.setup()
    renderColumn()
    await user.click(screen.getByRole('button', { name: 'Buscar na coluna A Fazer' }))
    await user.type(screen.getByRole('searchbox'), 'anexo{Escape}')
    expect(screen.queryByRole('searchbox')).toBeNull()
    const cards = screen.getAllByTestId('card')
    expect(cards).toHaveLength(3)
    expect(cards.every(c => c.dataset.dragDisabled === 'false')).toBe(true)
    expect(dropDisabled.at(-1)).toBe(false)
  })
})
