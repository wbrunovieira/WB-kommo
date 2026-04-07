export interface AuthTokensHttp {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  userId: string
  tenantId: string
  role: string
}

export interface RegisteredUserHttp {
  userId: string
  email: string
  name: string
  role: string
}

export class AuthPresenter {
  static toTokens(data: {
    accessToken: string
    refreshToken: string
    userId: string
    tenantId: string
    role: string
  }): AuthTokensHttp {
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenType: 'Bearer',
      userId: data.userId,
      tenantId: data.tenantId,
      role: data.role,
    }
  }

  static toRegistered(data: {
    userId: string
    email: string
    name: string
    role: string
  }): RegisteredUserHttp {
    return {
      userId: data.userId,
      email: data.email,
      name: data.name,
      role: data.role,
    }
  }
}
