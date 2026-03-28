import { describe, it, expect } from 'vitest'
import { kanbanReducer } from '@/lib/kanbanReducer'
import type { BoardState } from '@/types/kanban'

const initialState: BoardState = {
  projectName: 'Test Project',
  columns: [
    { id: 'col-1', title: 'A Fazer', cardIds: ['c1', 'c2'] },
    { id: 'col-2', title: 'Em Andamento', cardIds: ['c3'] },
  ],
  cards: {
    c1: { id: 'c1', title: 'Card 1', description: '', responsible: '', color: '#6b7280', createdAt: 0, updatedAt: 0 },
    c2: { id: 'c2', title: 'Card 2', description: '', responsible: '', color: '#6b7280', createdAt: 0, updatedAt: 0 },
    c3: { id: 'c3', title: 'Card 3', description: '', responsible: '', color: '#6b7280', createdAt: 0, updatedAt: 0 },
  },
}

describe('ADD_CARD', () => {
  it('appends new card ID to the target column cardIds', () => {
    const state = kanbanReducer(initialState, {
      type: 'ADD_CARD',
      payload: { columnId: 'col-1', title: 'New Card', description: '', responsible: '', color: '#6b7280' },
    })
    expect(state.columns[0].cardIds).toHaveLength(3)
  })

  it('creates card entry in cards map', () => {
    const state = kanbanReducer(initialState, {
      type: 'ADD_CARD',
      payload: { columnId: 'col-1', title: 'New Card', description: 'Desc', responsible: 'João', color: '#ef4444' },
    })
    const newId = state.columns[0].cardIds[2]
    expect(state.cards[newId]).toMatchObject({ title: 'New Card', description: 'Desc', responsible: 'João' })
  })
})

describe('DELETE_CARD', () => {
  it('removes card from cards map', () => {
    const state = kanbanReducer(initialState, {
      type: 'DELETE_CARD',
      payload: { cardId: 'c1', columnId: 'col-1' },
    })
    expect(state.cards).not.toHaveProperty('c1')
  })

  it('removes card ID from column cardIds', () => {
    const state = kanbanReducer(initialState, {
      type: 'DELETE_CARD',
      payload: { cardId: 'c1', columnId: 'col-1' },
    })
    expect(state.columns[0].cardIds).not.toContain('c1')
  })
})

describe('MOVE_CARD', () => {
  it('reorders cards within the same column', () => {
    const state = kanbanReducer(initialState, {
      type: 'MOVE_CARD',
      payload: { cardId: 'c1', sourceColumnId: 'col-1', destinationColumnId: 'col-1', sourceIndex: 0, destinationIndex: 1 },
    })
    expect(state.columns[0].cardIds).toEqual(['c2', 'c1'])
  })

  it('moves card to a different column', () => {
    const state = kanbanReducer(initialState, {
      type: 'MOVE_CARD',
      payload: { cardId: 'c1', sourceColumnId: 'col-1', destinationColumnId: 'col-2', sourceIndex: 0, destinationIndex: 0 },
    })
    expect(state.columns[0].cardIds).not.toContain('c1')
    expect(state.columns[1].cardIds).toContain('c1')
  })
})

describe('DELETE_COLUMN', () => {
  it('removes column from columns array', () => {
    const state = kanbanReducer(initialState, {
      type: 'DELETE_COLUMN',
      payload: { columnId: 'col-1' },
    })
    expect(state.columns).toHaveLength(1)
    expect(state.columns[0].id).toBe('col-2')
  })

  it('removes all cards belonging to the deleted column', () => {
    const state = kanbanReducer(initialState, {
      type: 'DELETE_COLUMN',
      payload: { columnId: 'col-1' },
    })
    expect(state.cards).not.toHaveProperty('c1')
    expect(state.cards).not.toHaveProperty('c2')
    expect(state.cards).toHaveProperty('c3')
  })
})

describe('REORDER_COLUMNS', () => {
  it('swaps column positions', () => {
    const state = kanbanReducer(initialState, {
      type: 'REORDER_COLUMNS',
      payload: { startIndex: 0, endIndex: 1 },
    })
    expect(state.columns[0].id).toBe('col-2')
    expect(state.columns[1].id).toBe('col-1')
  })
})

describe('UPDATE_CARD extended', () => {
  it('updates sprintId when provided', () => {
    const state = kanbanReducer(initialState, {
      type: 'UPDATE_CARD',
      payload: { cardId: 'c1', title: 'Card 1', description: '', responsible: '', color: '#6b7280', sprintId: 's1' },
    })
    expect(state.cards['c1'].sprintId).toBe('s1')
  })

  it('clears sprintId when null provided', () => {
    const stateWithSprint: BoardState = {
      ...initialState,
      cards: {
        ...initialState.cards,
        c1: { ...initialState.cards['c1'], sprintId: 's1' },
      },
    }
    const state = kanbanReducer(stateWithSprint, {
      type: 'UPDATE_CARD',
      payload: { cardId: 'c1', title: 'Card 1', description: '', responsible: '', color: '#6b7280', sprintId: null },
    })
    expect(state.cards['c1'].sprintId).toBeNull()
  })

  it('updates responsibleId when provided', () => {
    const state = kanbanReducer(initialState, {
      type: 'UPDATE_CARD',
      payload: { cardId: 'c1', title: 'Card 1', description: '', responsible: 'Ana', color: '#6b7280', responsibleId: 'u1' },
    })
    expect(state.cards['c1'].responsibleId).toBe('u1')
  })

  it('replaces card tags array when tags provided', () => {
    const newTags = [{ tagId: 't2', tag: { id: 't2', name: 'Feature', color: '#3b82f6' } }]
    const state = kanbanReducer(initialState, {
      type: 'UPDATE_CARD',
      payload: { cardId: 'c1', title: 'Card 1', description: '', responsible: '', color: '#6b7280', tags: newTags },
    })
    expect(state.cards['c1'].tags).toEqual(newTags)
  })
})
