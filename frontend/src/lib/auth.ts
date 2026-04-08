import { AuthTokens } from './api'

const ACCESS_TOKEN_KEY    = 'wb_access_token'
const USER_KEY            = 'wb_user'
const ORIGINAL_TOKEN_KEY  = 'wb_original_token'
const ORIGINAL_USER_KEY   = 'wb_original_user'
const IMPERSONATED_KEY    = 'wb_impersonated'

export interface StoredUser {
  userId: string
  tenantId: string
  role: string
}

export interface ImpersonatedInfo {
  name: string
  slug: string
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
  localStorage.removeItem(ORIGINAL_TOKEN_KEY)
  localStorage.removeItem(ORIGINAL_USER_KEY)
  localStorage.removeItem(IMPERSONATED_KEY)
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

// ── Impersonation ─────────────────────────────────────────────────────────────

export function startImpersonation(tokens: AuthTokens, company: ImpersonatedInfo) {
  // Persist originals before overwriting
  localStorage.setItem(ORIGINAL_TOKEN_KEY, getAccessToken() ?? '')
  localStorage.setItem(ORIGINAL_USER_KEY, localStorage.getItem(USER_KEY) ?? '')
  localStorage.setItem(IMPERSONATED_KEY, JSON.stringify(company))
  saveSession(tokens)
}

export function exitImpersonation() {
  const originalToken = localStorage.getItem(ORIGINAL_TOKEN_KEY)
  const originalUser  = localStorage.getItem(ORIGINAL_USER_KEY)
  if (originalToken) localStorage.setItem(ACCESS_TOKEN_KEY, originalToken)
  if (originalUser)  localStorage.setItem(USER_KEY, originalUser)
  localStorage.removeItem(ORIGINAL_TOKEN_KEY)
  localStorage.removeItem(ORIGINAL_USER_KEY)
  localStorage.removeItem(IMPERSONATED_KEY)
}

export function isImpersonating(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem(ORIGINAL_TOKEN_KEY)
}

export function getImpersonatedInfo(): ImpersonatedInfo | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(IMPERSONATED_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as ImpersonatedInfo } catch { return null }
}
