import { BoardState } from '@/types/kanban'

export function getDefaultBoardState(): BoardState {
  return {
    projectName: 'Meu Projeto',
    columns: [
      { id: 'col-1', title: 'A Fazer', cardIds: ['card-1', 'card-2'] },
      { id: 'col-2', title: 'Em Andamento', cardIds: ['card-3'] },
      { id: 'col-3', title: 'Concluído', cardIds: [] },
    ],
    cards: {
      'card-1': {
        id: 'card-1',
        title: 'Criar layout da página',
        description: 'Desenvolver o layout responsivo da página inicial com header e footer.',
        responsible: 'Ana Silva',
        color: '#3b82f6',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'card-2': {
        id: 'card-2',
        title: 'Configurar banco de dados',
        description: 'Definir schema e configurar conexão com o banco de dados.',
        responsible: 'Carlos Souza',
        color: '#8b5cf6',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      'card-3': {
        id: 'card-3',
        title: 'Autenticação de usuários',
        description: 'Implementar login, logout e controle de sessão.',
        responsible: 'Maria Lima',
        color: '#f97316',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    },
  }
}
