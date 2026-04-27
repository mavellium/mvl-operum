const SPRINT_SERVICE_URL = process.env.SPRINT_SERVICE_URL
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY

if (!SPRINT_SERVICE_URL) {
  throw new Error('SPRINT_SERVICE_URL is not set')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SPRINT_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-api-key': INTERNAL_API_KEY ?? '',
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`sprint-service ${init.method ?? 'GET'} ${path} → ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export function sprintServiceHeaders(tenantId: string, userId?: string) {
  const h: Record<string, string> = { 'x-tenant-id': tenantId }
  if (userId) h['x-user-id'] = userId
  return h
}

export const sprintClient = {
  listSprints: (projectId?: string) =>
    request(`/sprints${projectId ? `?projectId=${projectId}` : ''}`),

  getSprint: (id: string) =>
    request(`/sprints/${id}`),

  createSprint: (data: object) =>
    request('/sprints', { method: 'POST', body: JSON.stringify(data) }),

  updateSprint: (id: string, data: object) =>
    request(`/sprints/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteSprint: (id: string) =>
    request(`/sprints/${id}`, { method: 'DELETE' }),

  listColumns: (sprintId: string) =>
    request(`/sprints/${sprintId}/columns`),

  createColumn: (sprintId: string, data: object) =>
    request(`/sprints/${sprintId}/columns`, { method: 'POST', body: JSON.stringify(data) }),

  listCards: (sprintId: string) =>
    request(`/sprints/${sprintId}/cards`),

  getCard: (id: string) =>
    request(`/cards/${id}`),

  createCard: (data: object) =>
    request('/cards', { method: 'POST', body: JSON.stringify(data) }),

  updateCard: (id: string, data: object) =>
    request(`/cards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteCard: (id: string) =>
    request(`/cards/${id}`, { method: 'DELETE' }),

  listComments: (cardId: string) =>
    request(`/cards/${cardId}/comments`),

  createComment: (cardId: string, data: object, userId: string, tenantId: string) =>
    request(`/cards/${cardId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: sprintServiceHeaders(tenantId, userId),
    }),

  listTimeEntries: (cardId: string) =>
    request(`/cards/${cardId}/time-entries`),

  startTimer: (cardId: string, userId: string, tenantId: string, description?: string) =>
    request(`/cards/${cardId}/time-entries/start`, {
      method: 'POST',
      body: JSON.stringify({ description }),
      headers: sprintServiceHeaders(tenantId, userId),
    }),

  stopTimer: (entryId: string, userId: string, tenantId: string) =>
    request(`/time-entries/${entryId}/stop`, {
      method: 'POST',
      headers: sprintServiceHeaders(tenantId, userId),
    }),

  getMetrics: (sprintId: string) =>
    request(`/sprints/${sprintId}/metrics`),

  getFeedbacks: (sprintId: string) =>
    request(`/sprints/${sprintId}/feedback`),

  upsertFeedback: (sprintId: string, data: object, userId: string, tenantId: string) =>
    request(`/sprints/${sprintId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: sprintServiceHeaders(tenantId, userId),
    }),

  listTags: (tenantId: string) =>
    request('/tags', { headers: sprintServiceHeaders(tenantId) }),

  createTag: (data: object, userId: string, tenantId: string) =>
    request('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: sprintServiceHeaders(tenantId, userId),
    }),

  listAuditLogs: (tenantId: string, entity?: string, entityId?: string) => {
    const params = new URLSearchParams()
    if (entity) params.set('entity', entity)
    if (entityId) params.set('entityId', entityId)
    const qs = params.toString()
    return request(`/audit${qs ? `?${qs}` : ''}`, { headers: sprintServiceHeaders(tenantId) })
  },
}
