import { v4 as uuidv4 } from 'uuid'
import { BoardState, Card, CardColor } from '@/types/kanban'

export type KanbanAction =
  | { type: 'RENAME_PROJECT'; payload: { name: string } }
  | { type: 'ADD_COLUMN'; payload: { title: string } }
  | { type: 'RENAME_COLUMN'; payload: { columnId: string; title: string } }
  | { type: 'DELETE_COLUMN'; payload: { columnId: string } }
  | { type: 'REORDER_COLUMNS'; payload: { startIndex: number; endIndex: number } }
  | { type: 'ADD_CARD'; payload: { columnId: string; title: string; description: string; responsible: string; color: CardColor } }
  | { type: 'UPDATE_CARD'; payload: { cardId: string; title: string; description: string; responsible: string; color: CardColor; sprintId?: string | null; responsibleId?: string | null; tags?: Card['tags'] } }
  | { type: 'DELETE_CARD'; payload: { cardId: string; columnId: string } }
  | { type: 'MOVE_CARD'; payload: { sourceColumnId: string; destinationColumnId: string; sourceIndex: number; destinationIndex: number; cardId: string } }

export function kanbanReducer(state: BoardState, action: KanbanAction): BoardState {
  switch (action.type) {
    case 'RENAME_PROJECT':
      return { ...state, projectName: action.payload.name }

    case 'ADD_COLUMN': {
      const newColumn = { id: uuidv4(), title: action.payload.title, cardIds: [] }
      return { ...state, columns: [...state.columns, newColumn] }
    }

    case 'RENAME_COLUMN':
      return {
        ...state,
        columns: state.columns.map(col =>
          col.id === action.payload.columnId ? { ...col, title: action.payload.title } : col
        ),
      }

    case 'DELETE_COLUMN': {
      const column = state.columns.find(c => c.id === action.payload.columnId)
      if (!column) return state
      const newCards = { ...state.cards }
      column.cardIds.forEach(id => delete newCards[id])
      return {
        ...state,
        columns: state.columns.filter(c => c.id !== action.payload.columnId),
        cards: newCards,
      }
    }

    case 'REORDER_COLUMNS': {
      const cols = [...state.columns]
      const [removed] = cols.splice(action.payload.startIndex, 1)
      cols.splice(action.payload.endIndex, 0, removed)
      return { ...state, columns: cols }
    }

    case 'ADD_CARD': {
      const now = Date.now()
      const newCard: Card = {
        id: uuidv4(),
        title: action.payload.title,
        description: action.payload.description,
        responsible: action.payload.responsible,
        color: action.payload.color,
        createdAt: now,
        updatedAt: now,
      }
      return {
        ...state,
        cards: { ...state.cards, [newCard.id]: newCard },
        columns: state.columns.map(col =>
          col.id === action.payload.columnId
            ? { ...col, cardIds: [...col.cardIds, newCard.id] }
            : col
        ),
      }
    }

    case 'UPDATE_CARD': {
      const { cardId, title, description, responsible, color, sprintId, responsibleId, tags } = action.payload
      const updated: Card = {
        ...state.cards[cardId],
        title,
        description,
        responsible,
        color,
        updatedAt: Date.now(),
      }
      if ('sprintId' in action.payload) updated.sprintId = sprintId
      if ('responsibleId' in action.payload) updated.responsibleId = responsibleId
      if ('tags' in action.payload) updated.tags = tags
      return { ...state, cards: { ...state.cards, [cardId]: updated } }
    }

    case 'DELETE_CARD': {
      const newCards = { ...state.cards }
      delete newCards[action.payload.cardId]
      return {
        ...state,
        cards: newCards,
        columns: state.columns.map(col =>
          col.id === action.payload.columnId
            ? { ...col, cardIds: col.cardIds.filter(id => id !== action.payload.cardId) }
            : col
        ),
      }
    }

    case 'MOVE_CARD': {
      const { sourceColumnId, destinationColumnId, sourceIndex, destinationIndex } = action.payload
      if (sourceColumnId === destinationColumnId) {
        const col = state.columns.find(c => c.id === sourceColumnId)!
        const newCardIds = [...col.cardIds]
        const [removed] = newCardIds.splice(sourceIndex, 1)
        newCardIds.splice(destinationIndex, 0, removed)
        return {
          ...state,
          columns: state.columns.map(c =>
            c.id === sourceColumnId ? { ...c, cardIds: newCardIds } : c
          ),
        }
      } else {
        const srcCol = state.columns.find(c => c.id === sourceColumnId)!
        const dstCol = state.columns.find(c => c.id === destinationColumnId)!
        const srcCardIds = [...srcCol.cardIds]
        const dstCardIds = [...dstCol.cardIds]
        const [removed] = srcCardIds.splice(sourceIndex, 1)
        dstCardIds.splice(destinationIndex, 0, removed)
        return {
          ...state,
          columns: state.columns.map(c => {
            if (c.id === sourceColumnId) return { ...c, cardIds: srcCardIds }
            if (c.id === destinationColumnId) return { ...c, cardIds: dstCardIds }
            return c
          }),
        }
      }
    }

    default:
      return state
  }
}
