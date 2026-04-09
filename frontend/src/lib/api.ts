const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export interface LoginPayload {
  workspace: string
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  tokenType: string
  userId: string
  tenantId: string
  role: string
}

export interface ApiError {
  title: string
  status: number
  detail: string
}

export interface TenantListItem {
  id: string
  name: string
  slug: string
  isActive: boolean
  resellerTenantId: string | null
}

export interface CreateTenantPayload {
  name: string
  slug: string
  resellerTenantId?: string
}

export interface CreatedTenant {
  id: string
  name: string
  slug: string
  resellerTenantId: string | null
}

export interface RegisterUserPayload {
  tenantId: string
  name: string
  email: string
  password: string
  role: 'ACCOUNT_ADMIN' | 'MEMBER'
}

export interface RegisteredUser {
  userId: string
  email: string
  name: string
  role: string
}

async function tryRefreshToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) return null
    const data: AuthTokens = await res.json()
    // Update stored session with new token and role
    const { saveSession } = await import('@/lib/auth')
    saveSession(data)
    return data.accessToken
  } catch {
    return null
  }
}

async function apiFetch<T>(path: string, init: RequestInit, accessToken: string, isRetry = false): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
    credentials: 'include',
  })

  if (res.status === 401) {
    if (!isRetry && typeof window !== 'undefined') {
      // Attempt token refresh once
      const newToken = await tryRefreshToken()
      if (newToken) {
        return apiFetch<T>(path, init, newToken, true)
      }
      // Refresh failed — clear session and redirect to login
      localStorage.clear()
      window.location.href = '/login'
    }
    throw { title: 'Unauthorized', status: 401, detail: 'Session expired.' } as ApiError
  }

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({
      title: 'Unexpected error',
      status: res.status,
      detail: 'Please try again.',
    }))
    throw err
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({
      title: 'Erro inesperado',
      status: res.status,
      detail: 'Tente novamente.',
    }))
    throw err
  }

  return res.json()
}

export async function getTenants(accessToken: string): Promise<TenantListItem[]> {
  return apiFetch<TenantListItem[]>('/tenants', { method: 'GET' }, accessToken)
}

export async function impersonate(targetTenantId: string, accessToken: string): Promise<AuthTokens> {
  return apiFetch<AuthTokens>(`/auth/impersonate/${targetTenantId}`, { method: 'POST' }, accessToken)
}

export async function createTenant(payload: CreateTenantPayload, accessToken: string): Promise<CreatedTenant> {
  return apiFetch<CreatedTenant>('/tenants', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, accessToken)
}

export async function registerUser(payload: RegisterUserPayload, accessToken: string): Promise<RegisteredUser> {
  return apiFetch<RegisteredUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, accessToken)
}

// ── Leads ──────────────────────────────────────────────────────────────────────

export interface Lead {
  id: string
  name: string
  pipelineId: string
  stageId: string
  status: 'OPEN' | 'WON' | 'LOST'
  value?: number
  assignedToId?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface Pipeline {
  id: string
  name: string
  tenantId: string
  isActive: boolean
}

export interface Stage {
  id: string
  name: string
  pipelineId: string
  order: number
  color?: string
}

export interface CreateLeadPayload {
  name: string
  pipelineId: string
  stageId: string
  value?: number
  assignedToId?: string
  tags?: string[]
}

export interface UpdateLeadPayload {
  name?: string
  stageId?: string
  value?: number
  status?: string
  tags?: string[]
}

export async function getLeads(
  token: string,
  filters?: { pipelineId?: string; stageId?: string; status?: string },
): Promise<Lead[]> {
  const params = new URLSearchParams()
  if (filters?.pipelineId) params.set('pipelineId', filters.pipelineId)
  if (filters?.stageId) params.set('stageId', filters.stageId)
  if (filters?.status) params.set('status', filters.status)
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<Lead[]>(`/leads${query}`, { method: 'GET' }, token)
}

export async function getLead(id: string, token: string): Promise<Lead> {
  return apiFetch<Lead>(`/leads/${id}`, { method: 'GET' }, token)
}

export async function createLead(payload: CreateLeadPayload, token: string): Promise<Lead> {
  return apiFetch<Lead>('/leads', { method: 'POST', body: JSON.stringify(payload) }, token)
}

export async function updateLead(id: string, updates: UpdateLeadPayload, token: string): Promise<Lead> {
  return apiFetch<Lead>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }, token)
}

export async function softDeleteLead(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/leads/${id}`, { method: 'DELETE' }, token)
}

export async function restoreLead(id: string, token: string): Promise<Lead> {
  return apiFetch<Lead>(`/leads/${id}/restore`, { method: 'POST' }, token)
}

export async function getPipelines(token: string): Promise<Pipeline[]> {
  return apiFetch<Pipeline[]>('/pipelines', { method: 'GET' }, token)
}

export async function createPipeline(payload: { name: string }, token: string): Promise<Pipeline> {
  return apiFetch<Pipeline>('/pipelines', { method: 'POST', body: JSON.stringify(payload) }, token)
}

export async function updatePipeline(id: string, updates: { name?: string; isActive?: boolean }, token: string): Promise<Pipeline> {
  return apiFetch<Pipeline>(`/pipelines/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }, token)
}

export async function deletePipeline(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/pipelines/${id}`, { method: 'DELETE' }, token)
}

export async function getStages(pipelineId: string, token: string): Promise<Stage[]> {
  return apiFetch<Stage[]>(`/pipelines/${pipelineId}/stages`, { method: 'GET' }, token)
}

export interface CreateStagePayload {
  name: string
  order?: number
  color?: string
}

export async function createStage(pipelineId: string, payload: CreateStagePayload, token: string): Promise<Stage> {
  return apiFetch<Stage>(`/pipelines/${pipelineId}/stages`, { method: 'POST', body: JSON.stringify(payload) }, token)
}
