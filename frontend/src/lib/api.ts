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

async function apiFetch<T>(path: string, init: RequestInit, accessToken: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
    credentials: 'include',
  })
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
