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
  role: 'PLATFORM_OWNER' | 'RESELLER' | 'ACCOUNT_ADMIN' | 'MEMBER' | 'AGENT'
  timezone?: string
  language?: string
}

export interface WorkspaceUser {
  identityId: string
  name: string
  email: string
  role: string
  timezone: string
  language: string
  isEmailVerified: boolean
  createdAt: string
}

export interface RegisteredUser {
  userId: string
  email: string
  name: string
  role: string
}

// Singleton promise: prevents multiple concurrent 401s from each triggering
// their own refresh call (token rotation would invalidate the first rotated
// token before the others even read it, causing a cascade redirect to login).
let _refreshing: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  if (_refreshing) return _refreshing

  _refreshing = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return null
      const data: AuthTokens = await res.json()
      if (typeof window !== 'undefined') {
        localStorage.setItem('wb_access_token', data.accessToken)
        localStorage.setItem('wb_user', JSON.stringify({
          userId: data.userId,
          tenantId: data.tenantId,
          role: data.role,
        }))
      }
      return data.accessToken
    } catch {
      return null
    } finally {
      _refreshing = null
    }
  })()

  return _refreshing
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

export async function getWorkspaceUsers(token: string, tenantId?: string): Promise<WorkspaceUser[]> {
  const query = tenantId ? `?tenantId=${tenantId}` : ''
  return apiFetch<WorkspaceUser[]>(`/workspace/users${query}`, { method: 'GET' }, token)
}

export async function createWorkspaceUser(payload: RegisterUserPayload, token: string): Promise<RegisteredUser> {
  return apiFetch<RegisteredUser>('/workspace/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
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
  customFields?: Record<string, unknown>
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

export interface LeadFieldConfig {
  id: string
  tenantId: string
  key: string
  label: string
  type: 'TEXT' | 'NUMBER' | 'EMAIL' | 'PHONE' | 'DATE' | 'SELECT'
  isRequired: boolean
  isActive: boolean
  isBuiltin: boolean
  order: number
  options: string[]
}

export interface CreateLeadPayload {
  name: string
  pipelineId: string
  stageId: string
  value?: number
  assignedToId?: string
  tags?: string[]
  customFields?: Record<string, unknown>
}

export interface UpdateLeadPayload {
  name?: string
  stageId?: string
  value?: number
  status?: string
  tags?: string[]
  customFields?: Record<string, unknown>
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

export async function updateStage(
  pipelineId: string,
  stageId: string,
  updates: { name?: string; color?: string },
  token: string,
): Promise<Stage> {
  return apiFetch<Stage>(`/pipelines/${pipelineId}/stages/${stageId}`, { method: 'PATCH', body: JSON.stringify(updates) }, token)
}

export async function reorderStages(
  pipelineId: string,
  order: Array<{ stageId: string; order: number }>,
  token: string,
): Promise<void> {
  return apiFetch<void>(`/pipelines/${pipelineId}/stages/reorder`, { method: 'PATCH', body: JSON.stringify({ order }) }, token)
}

// ── Lead Field Configs ─────────────────────────────────────────────────────────

export async function getLeadFieldConfigs(token: string): Promise<LeadFieldConfig[]> {
  return apiFetch<LeadFieldConfig[]>('/lead-field-configs', { method: 'GET' }, token)
}

export async function createLeadFieldConfig(
  payload: { label: string; type: string; isRequired?: boolean; options?: string[] },
  token: string,
): Promise<LeadFieldConfig> {
  return apiFetch<LeadFieldConfig>('/lead-field-configs', { method: 'POST', body: JSON.stringify(payload) }, token)
}

export async function updateLeadFieldConfig(
  id: string,
  updates: { label?: string; isActive?: boolean; isRequired?: boolean; order?: number; options?: string[] },
  token: string,
): Promise<LeadFieldConfig> {
  return apiFetch<LeadFieldConfig>(`/lead-field-configs/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }, token)
}

export async function deleteLeadFieldConfig(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/lead-field-configs/${id}`, { method: 'DELETE' }, token)
}

export async function reorderLeadFieldConfigs(
  order: Array<{ configId: string; order: number }>,
  token: string,
): Promise<void> {
  return apiFetch<void>('/lead-field-configs/reorder', { method: 'PATCH', body: JSON.stringify({ order }) }, token)
}
