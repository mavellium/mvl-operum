// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/dal', () => ({ verifySession: vi.fn() }))
vi.mock('@/lib/api-client', () => ({
  cardsApi: {
    get: vi.fn(),
    addResponsible: vi.fn(),
    removeResponsible: vi.fn(),
  },
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    userProject: { findMany: vi.fn() },
  },
}))
vi.mock('@/services/projectService', () => ({ findById: vi.fn() }))
vi.mock('@/lib/notificationPublisher', () => ({ publishNotification: vi.fn() }))

import { verifySession } from '@/lib/dal'
import { cardsApi } from '@/lib/api-client'
import { publishNotification } from '@/lib/notificationPublisher'
import { findById } from '@/services/projectService'
import { addResponsibleAction, removeResponsibleAction } from '@/app/actions/cardResponsible'

const mockVerify = verifySession as ReturnType<typeof vi.fn>
const _mockPublish = publishNotification as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockVerify.mockResolvedValue({ userId: 'u1' })
})

describe('addResponsibleAction', () => {
  it('atribui o responsável e publica notificação ASSIGNMENT com deep link e nome do projeto', async () => {
    vi.mocked(cardsApi.addResponsible).mockResolvedValue({ cardId: 'c1', userId: 'u2' })
    vi.mocked(cardsApi.get).mockResolvedValue({ id: 'c1', title: 'Criar relatório', sprintId: 's1', projectId: 'p1' })
    vi.mocked(findById).mockResolvedValue({ id: 'p1', name: 'Projeto Alfa' } as never)

    const result = await addResponsibleAction('c1', 'u2')

    expect(cardsApi.addResponsible).toHaveBeenCalledWith('c1', 'u2')
    expect(result).toEqual({ entry: { cardId: 'c1', userId: 'u2' } })
    expect(cardsApi.get).toHaveBeenCalledWith('c1')
    expect(findById).toHaveBeenCalledWith('p1')
    expect(publishNotification).toHaveBeenCalledWith({
      userId: 'u2',
      type: 'ASSIGNMENT',
      title: 'Nova tarefa atribuída',
      message: 'Você foi designado responsável pela tarefa "Criar relatório" no projeto Projeto Alfa',
      reference: '/projetos/p1/sprints/s1?card=c1',
      referenceType: 'CARD',
    })
  })

  it('usa rota global da sprint e mensagem sem projeto quando o card não tem projectId (legado)', async () => {
    vi.mocked(cardsApi.addResponsible).mockResolvedValue({ cardId: 'c1', userId: 'u2' })
    vi.mocked(cardsApi.get).mockResolvedValue({ id: 'c1', title: 'Tarefa', sprintId: 's1', projectId: null })

    await addResponsibleAction('c1', 'u2')

    expect(findById).not.toHaveBeenCalled()
    expect(publishNotification).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Você foi designado responsável pela tarefa "Tarefa"',
      reference: '/sprints/s1?card=c1',
    }))
  })

  it('não gera link quando o card está só no backlog (sem sprint), mas mantém o nome do projeto na mensagem', async () => {
    vi.mocked(cardsApi.addResponsible).mockResolvedValue({ cardId: 'c1', userId: 'u2' })
    vi.mocked(cardsApi.get).mockResolvedValue({ id: 'c1', title: 'Tarefa', sprintId: null, projectId: 'p1' })
    vi.mocked(findById).mockResolvedValue({ id: 'p1', name: 'Projeto Alfa' } as never)

    await addResponsibleAction('c1', 'u2')

    expect(publishNotification).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Você foi designado responsável pela tarefa "Tarefa" no projeto Projeto Alfa',
      reference: undefined,
    }))
  })

  it('notifica sem o nome do projeto quando a consulta do projeto falha (best-effort)', async () => {
    vi.mocked(cardsApi.addResponsible).mockResolvedValue({ cardId: 'c1', userId: 'u2' })
    vi.mocked(cardsApi.get).mockResolvedValue({ id: 'c1', title: 'Tarefa', sprintId: 's1', projectId: 'p1' })
    vi.mocked(findById).mockRejectedValue(new Error('db timeout'))

    await addResponsibleAction('c1', 'u2')

    expect(publishNotification).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Você foi designado responsável pela tarefa "Tarefa"',
      reference: '/projetos/p1/sprints/s1?card=c1',
    }))
  })

  it('não quebra a atribuição se a notificação falhar (best-effort)', async () => {
    vi.mocked(cardsApi.addResponsible).mockResolvedValue({ cardId: 'c1', userId: 'u2' })
    vi.mocked(cardsApi.get).mockRejectedValue(new Error('card not found'))

    const result = await addResponsibleAction('c1', 'u2')

    expect(result).toEqual({ entry: { cardId: 'c1', userId: 'u2' } })
    expect(findById).not.toHaveBeenCalled()
    expect(publishNotification).not.toHaveBeenCalled()
  })

  it('retorna erro e não notifica se a atribuição falhar', async () => {
    vi.mocked(cardsApi.addResponsible).mockRejectedValue(new Error('não foi possível atribuir'))

    const result = await addResponsibleAction('c1', 'u2')

    expect(result).toHaveProperty('error')
    expect(publishNotification).not.toHaveBeenCalled()
  })
})

describe('removeResponsibleAction', () => {
  it('remove o responsável sem publicar notificação', async () => {
    vi.mocked(cardsApi.removeResponsible).mockResolvedValue(undefined)

    const result = await removeResponsibleAction('c1', 'u2')

    expect(cardsApi.removeResponsible).toHaveBeenCalledWith('c1', 'u2')
    expect(result).toEqual({ success: true })
    expect(publishNotification).not.toHaveBeenCalled()
  })
})