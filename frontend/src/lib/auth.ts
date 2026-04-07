import { AuthTokens } from './api'

const ACCESS_TOKEN_KEY = 'wb_access_token'
const USER_KEY = 'wb_user'

export interface StoredUser {
  userId: string
  tenantId: string
  role: string
}

export function saveSession(tokens: AuthTokens) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      userId: tokens.userId,
      tenantId: tokens.tenantId,
      role: tokens.role,
    } satisfies StoredUser),
  )
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}
