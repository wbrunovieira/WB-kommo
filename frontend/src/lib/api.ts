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
