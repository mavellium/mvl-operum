const PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY

if (!PROJECT_SERVICE_URL) {
  throw new Error('PROJECT_SERVICE_URL is not set')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PROJECT_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-api-key': INTERNAL_API_KEY ?? '',
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`project-service ${init.method ?? 'GET'} ${path} → ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}

export function projectServiceHeaders(tenantId: string, userId?: string) {
  const h: Record<string, string> = { 'x-tenant-id': tenantId }
  if (userId) h['x-user-id'] = userId
  return h
}

export const projectClient = {
  listProjects: (tenantId: string, page = 1, limit = 20) =>
    request(`/projects?page=${page}&limit=${limit}`, { headers: projectServiceHeaders(tenantId) }),

  getProject: (id: string, tenantId: string) =>
    request(`/projects/${id}`, { headers: projectServiceHeaders(tenantId) }),

  getUserActiveProjects: (userId: string, tenantId: string) =>
    request(`/projects/user/${userId}`, { headers: projectServiceHeaders(tenantId) }),

  createProject: (data: object, tenantId: string) =>
    request('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: projectServiceHeaders(tenantId),
    }),

  updateProject: (id: string, data: object, tenantId: string) =>
    request(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: projectServiceHeaders(tenantId),
    }),

  deleteProject: (id: string, tenantId: string) =>
    request(`/projects/${id}`, { method: 'DELETE', headers: projectServiceHeaders(tenantId) }),

  getMembers: (projectId: string, tenantId: string) =>
    request(`/projects/${projectId}/members`, { headers: projectServiceHeaders(tenantId) }),

  addMember: (projectId: string, data: object, tenantId: string) =>
    request(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: projectServiceHeaders(tenantId),
    }),

  removeMember: (projectId: string, userId: string, tenantId: string) =>
    request(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
      headers: projectServiceHeaders(tenantId),
    }),

  listDepartments: (tenantId: string) =>
    request('/departments', { headers: projectServiceHeaders(tenantId) }),

  getDepartment: (id: string, tenantId: string) =>
    request(`/departments/${id}`, { headers: projectServiceHeaders(tenantId) }),

  createDepartment: (data: object, tenantId: string) =>
    request('/departments', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: projectServiceHeaders(tenantId),
    }),

  updateDepartment: (id: string, data: object, tenantId: string) =>
    request(`/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: projectServiceHeaders(tenantId),
    }),

  deleteDepartment: (id: string, tenantId: string) =>
    request(`/departments/${id}`, { method: 'DELETE', headers: projectServiceHeaders(tenantId) }),

  listRoles: (tenantId: string) =>
    request('/roles', { headers: projectServiceHeaders(tenantId) }),

  createRole: (data: object, tenantId: string) =>
    request('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: projectServiceHeaders(tenantId),
    }),

  listPermissions: (tenantId: string) =>
    request('/permissions', { headers: projectServiceHeaders(tenantId) }),

  listStakeholders: (tenantId: string) =>
    request('/stakeholders', { headers: projectServiceHeaders(tenantId) }),

  createStakeholder: (data: object, tenantId: string) =>
    request('/stakeholders', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: projectServiceHeaders(tenantId),
    }),

  updateStakeholder: (id: string, data: object, tenantId: string) =>
    request(`/stakeholders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      headers: projectServiceHeaders(tenantId),
    }),
}
