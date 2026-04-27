import 'server-only'
import { cookies } from 'next/headers'

// Internal URL for server→gateway calls (avoids external round-trip inside Docker)
// Falls back to the public API URL for local dev where there's no Docker network
const API_URL = (process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get('session')?.value
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken()

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: 'no-store',
  })

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    let message = body
    try { message = (JSON.parse(body) as { message?: string }).message ?? body } catch { /* noop */ }
    throw new Error(message || `${init.method ?? 'GET'} ${path} → ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────

export const authApi = {
  me: () => request<{ id: string; name: string; email: string; role: string; tenantId: string; avatarUrl?: string; cargo?: string; departamento?: string; hourlyRate?: number; isActive: boolean; forcePasswordChange: boolean; phone?: string; cep?: string; logradouro?: string; numero?: string; complemento?: string; bairro?: string; cidade?: string; estado?: string; notes?: string }>('/auth/me'),

  updateProfile: (data: Record<string, unknown>) =>
    request('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request('/auth/password/change', { method: 'POST', body: JSON.stringify(data) }),

  alterarSenha: (password: string) =>
    request('/auth/password/alterar', { method: 'POST', body: JSON.stringify({ password }) }),
}

type AdminUser = { id: string; name: string; email: string; role: string; avatarUrl?: string | null; isActive?: boolean; phone?: string; cep?: string; logradouro?: string; numero?: string; complemento?: string; bairro?: string; cidade?: string; estado?: string; notes?: string }

// ── Admin ─────────────────────────────────────────────────

export const adminApi = {
  listUsers: () =>
    request<AdminUser[]>('/auth/users'),

  listAllUsers: () =>
    request<AdminUser[]>('/auth/all-users'),

  createUser: (data: Record<string, unknown>) =>
    request<AdminUser>('/auth/admin/users', { method: 'POST', body: JSON.stringify(data) }),

  updateUser: (userId: string, data: Record<string, unknown>) =>
    request<AdminUser>(`/auth/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  toggleActive: (userId: string, active: boolean) =>
    request(`/auth/admin/users/${userId}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }),

  setRole: (userId: string, role: string) =>
    request(`/auth/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
}

type Project = { id: string; name: string; description?: string | null; tenantId?: string; status?: string; slogan?: string | null; startDate?: string | null; endDate?: string | null; location?: string | null; logoUrl?: string | null; justificativa?: string | null; objetivos?: string | null; metodologia?: string | null; descricaoProduto?: string | null; premissas?: string | null; restricoes?: string | null; limitesAutoridade?: string | null; semestre?: string | null; ano?: number | null; departamentos?: string[] | null; macroFases?: { fase: string; dataLimite?: string | null; custo?: string | null }[] | null }

// ── Projects ──────────────────────────────────────────────

export const projectsApi = {
  list: (page = 1, limit = 50) =>
    request<{ items: Project[]; total: number }>(`/projects?page=${page}&limit=${limit}`),

  get: (id: string) => request<Project>(`/projects/${id}`),

  getUserProjects: (userId: string) => request<unknown[]>(`/projects/user/${userId}`),

  create: (data: Record<string, unknown>) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    request<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request(`/projects/${id}`, { method: 'DELETE' }),

  getMembers: (projectId: string) => request<unknown[]>(`/projects/${projectId}/members`),

  addMember: (projectId: string, data: Record<string, unknown>) =>
    request(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(data) }),

  removeMember: (projectId: string, userId: string) =>
    request(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),

  listMacroFases: (projectId: string) => request<unknown[]>(`/projects/${projectId}/macro-fases`),

  upsertMacroFases: (projectId: string, fases: unknown[]) =>
    request(`/projects/${projectId}/macro-fases`, { method: 'POST', body: JSON.stringify({ fases }) }),

  getProjectRoles: (projectId: string) => request<unknown[]>(`/projects/${projectId}/roles`),

  assignProjectRole: (projectId: string, userId: string, roleId: string) =>
    request(`/projects/${projectId}/roles`, { method: 'POST', body: JSON.stringify({ userId, roleId }) }),

  removeProjectRole: (projectId: string, userId: string) =>
    request(`/projects/${projectId}/roles/${userId}`, { method: 'DELETE' }),
}

type Department = { id: string; name: string }

// ── Departments ───────────────────────────────────────────

export const departmentsApi = {
  list: () => request<Department[]>('/departments'),

  get: (id: string) => request<Department>(`/departments/${id}`),

  create: (data: Record<string, unknown>) =>
    request<Department>('/departments', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    request<Department>(`/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request(`/departments/${id}`, { method: 'DELETE' }),

  addUser: (departmentId: string, userId: string) =>
    request(`/departments/${departmentId}/users`, { method: 'POST', body: JSON.stringify({ userId }) }),

  removeUser: (departmentId: string, userId: string) =>
    request(`/departments/${departmentId}/users/${userId}`, { method: 'DELETE' }),
}

type Role = { id: string; name: string; scope?: string }

// ── Roles & Permissions ───────────────────────────────────

export const rolesApi = {
  list: () => request<Role[]>('/roles'),

  get: (id: string) => request<Role>(`/roles/${id}`),

  create: (data: Record<string, unknown>) =>
    request<Role>('/roles', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    request<Role>(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request(`/roles/${id}`, { method: 'DELETE' }),

  listPermissions: () => request<unknown[]>('/permissions'),

  createPermission: (data: Record<string, unknown>) =>
    request('/permissions', { method: 'POST', body: JSON.stringify(data) }),

  assignPermission: (roleId: string, permissionId: string) =>
    request(`/roles/${roleId}/permissions/${permissionId}`, { method: 'POST' }),

  removePermission: (roleId: string, permissionId: string) =>
    request(`/roles/${roleId}/permissions/${permissionId}`, { method: 'DELETE' }),
}

// ── Stakeholders ──────────────────────────────────────────

export const stakeholdersApi = {
  list: () => request<unknown[]>('/stakeholders'),

  get: (id: string) => request<Record<string, unknown>>(`/stakeholders/${id}`),

  create: (data: Record<string, unknown>) =>
    request('/stakeholders', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    request(`/stakeholders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request(`/stakeholders/${id}`, { method: 'DELETE' }),

  listByProject: (projectId: string) => request<unknown[]>(`/stakeholders/by-project/${projectId}`),

  linkProject: (stakeholderId: string, projectId: string) =>
    request(`/stakeholders/${stakeholderId}/projects/${projectId}`, { method: 'POST' }),

  unlinkProject: (stakeholderId: string, projectId: string) =>
    request(`/stakeholders/${stakeholderId}/projects/${projectId}`, { method: 'DELETE' }),
}

// ── Sprints ───────────────────────────────────────────────

export const sprintsApi = {
  list: (projectId?: string) =>
    request<unknown[]>(`/sprints${projectId ? `?projectId=${projectId}` : ''}`),

  get: (id: string) => request<Record<string, unknown>>(`/sprints/${id}`),

  create: (data: Record<string, unknown>) =>
    request<{ id: string; name: string; status: string }>('/sprints', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    request<{ id: string; name: string; status: string; startDate: Date | string | null; endDate: Date | string | null; qualidade?: number | null; dificuldade?: number | null }>(`/sprints/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request(`/sprints/${id}`, { method: 'DELETE' }),

  listColumns: (sprintId: string) => request<unknown[]>(`/sprints/${sprintId}/columns`),

  createColumn: (sprintId: string, data: Record<string, unknown>) =>
    request<{ id: string; title: string; position: number }>(`/sprints/${sprintId}/columns`, { method: 'POST', body: JSON.stringify(data) }),

  updateColumn: (sprintId: string, columnId: string, data: Record<string, unknown>) =>
    request(`/sprints/${sprintId}/columns/${columnId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteColumn: (sprintId: string, columnId: string) =>
    request(`/sprints/${sprintId}/columns/${columnId}`, { method: 'DELETE' }),

  reorderColumns: (sprintId: string, columnIds: string[]) =>
    request(`/sprints/${sprintId}/columns/reorder`, { method: 'POST', body: JSON.stringify({ columnIds }) }),

  listCards: (sprintId: string) => request<unknown[]>(`/sprints/${sprintId}/cards`),

  getMetrics: (sprintId: string) => request<unknown[]>(`/sprints/${sprintId}/metrics`),

  getSprintDashboard: (sprintId: string) => request<Record<string, unknown>>(`/sprints/${sprintId}/dashboard`),

  getGlobalMetrics: () => request<Record<string, unknown>>('/dashboard/global'),

  getFeedbacks: (sprintId: string) => request<unknown[]>(`/sprints/${sprintId}/feedback`),

  upsertFeedback: (sprintId: string, data: Record<string, unknown>) =>
    request(`/sprints/${sprintId}/feedback`, { method: 'POST', body: JSON.stringify(data) }),
}

// ── Cards ─────────────────────────────────────────────────

export const cardsApi = {
  get: (id: string) => request<Record<string, unknown>>(`/cards/${id}`),

  create: (data: Record<string, unknown>) =>
    request<{ id: string; title: string; description: string; color: string; priority?: string | null }>('/cards', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Record<string, unknown>) =>
    request(`/cards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: string) =>
    request(`/cards/${id}`, { method: 'DELETE' }),

  addTag: (cardId: string, tagId: string) =>
    request(`/cards/${cardId}/tags/${tagId}`, { method: 'POST' }),

  removeTag: (cardId: string, tagId: string) =>
    request(`/cards/${cardId}/tags/${tagId}`, { method: 'DELETE' }),

  addResponsible: (cardId: string, userId: string) =>
    request(`/cards/${cardId}/responsibles/${userId}`, { method: 'POST' }),

  removeResponsible: (cardId: string, userId: string) =>
    request(`/cards/${cardId}/responsibles/${userId}`, { method: 'DELETE' }),

  listComments: (cardId: string) => request<{ id: string; user: { id: string; name: string; avatarUrl: string | null }; content: string; createdAt: Date }[]>(`/cards/${cardId}/comments`),

  createComment: (cardId: string, content: string, type?: string) =>
    request<{ id: string; user: { id: string; name: string; avatarUrl: string | null }; content: string; createdAt: Date }>(`/cards/${cardId}/comments`, { method: 'POST', body: JSON.stringify({ content, type }) }),

  updateComment: (cardId: string, commentId: string, content: string) =>
    request(`/cards/${cardId}/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),

  deleteComment: (cardId: string, commentId: string) =>
    request(`/cards/${cardId}/comments/${commentId}`, { method: 'DELETE' }),

  listTimeEntries: (cardId: string) => request<unknown[]>(`/cards/${cardId}/time-entries`),

  getActiveTimer: (cardId: string) =>
    request<{ id: string; isRunning: boolean; startedAt: string | Date; duration: number | null } | null>(`/cards/${cardId}/time-entries/active`),

  getTimeTotal: (cardId: string) =>
    request<{ seconds: number }>(`/cards/${cardId}/time-entries/total`),

  startTimer: (cardId: string, description?: string) =>
    request(`/cards/${cardId}/time-entries/start`, { method: 'POST', body: JSON.stringify({ description }) }),

  stopTimer: (cardId: string) =>
    request(`/cards/${cardId}/time-entries/stop`, { method: 'POST' }),

  createManualEntry: (cardId: string, data: Record<string, unknown>) =>
    request(`/cards/${cardId}/time-entries/manual`, { method: 'POST', body: JSON.stringify(data) }),

  search: (q: string) =>
    request<unknown[]>(`/cards/search?q=${encodeURIComponent(q)}`),
}

// ── Tags ──────────────────────────────────────────────────

export const tagsApi = {
  list: () => request<unknown[]>('/tags'),

  create: (name: string, color?: string) =>
    request('/tags', { method: 'POST', body: JSON.stringify({ name, color }) }),

  delete: (id: string) =>
    request(`/tags/${id}`, { method: 'DELETE' }),
}

// ── Time entries ──────────────────────────────────────────

export const timeEntriesApi = {
  listByUser: (userId: string) => request<unknown[]>(`/users/${userId}/time-entries`),

  stop: (entryId: string) =>
    request(`/time-entries/${entryId}/stop`, { method: 'POST' }),

  update: (entryId: string, data: Record<string, unknown>) =>
    request(`/time-entries/${entryId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (entryId: string) =>
    request(`/time-entries/${entryId}`, { method: 'DELETE' }),
}

// ── Notifications ─────────────────────────────────────────

export const notificationsApi = {
  list: (userId: string, params?: Record<string, string>) => {
    const qs = new URLSearchParams({ userId, limit: '100', ...params }).toString()
    return request<unknown[]>(`/notifications?${qs}`)
  },

  markRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: (userId: string) =>
    request(`/notifications/mark-all-read`, { method: 'PATCH', body: JSON.stringify({ userId }) }),

  archive: (id: string) =>
    request(`/notifications/${id}/archive`, { method: 'PATCH' }),
}

// ── Files ─────────────────────────────────────────────────

export const filesApi = {
  getPresignedUrl: (attachmentId: string) =>
    request<{ url: string }>(`/files/${attachmentId}/url`),

  setCover: (cardId: string, attachmentId: string) =>
    request(`/files/attachments/${attachmentId}/cover`, { method: 'PATCH', body: JSON.stringify({ cardId }) }),

  delete: (attachmentId: string) =>
    request(`/files/${attachmentId}`, { method: 'DELETE' }),
}

// ── Audit ──────────────────────────────────────────────────

export const auditApi = {
  list: (entity?: string, entityId?: string, page = 1, limit = 50) => {
    const params = new URLSearchParams()
    if (entity) params.set('entity', entity)
    if (entityId) params.set('entityId', entityId)
    params.set('page', String(page))
    params.set('limit', String(limit))
    return request<unknown[]>(`/audit?${params}`)
  },

  log: (action: string, entity: string, entityId?: string, details?: object) =>
    request('/audit', { method: 'POST', body: JSON.stringify({ action, entity, entityId, details }) }),
}
