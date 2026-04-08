import { ApiProperty } from '@nestjs/swagger'

export class AuthTokensResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiJ9...' })
  accessToken!: string

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer'

  @ApiProperty({ example: 'user-uuid' })
  userId!: string

  @ApiProperty({ example: 'tenant-uuid' })
  tenantId!: string

  @ApiProperty({ enum: ['RESELLER', 'ACCOUNT_ADMIN', 'MEMBER'] })
  role!: string
}

export class RegisteredUserResponse {
  @ApiProperty({ example: 'user-uuid' })
  userId!: string

  @ApiProperty({ example: 'alice@company.com' })
  email!: string

  @ApiProperty({ example: 'Alice Smith' })
  name!: string

  @ApiProperty({ enum: ['RESELLER', 'ACCOUNT_ADMIN', 'MEMBER'] })
  role!: string
}

export class AuthPresenter {
  static toTokens(data: {
    accessToken: string
    userId: string
    tenantId: string
    role: string
  }): AuthTokensResponse {
    return {
      accessToken: data.accessToken,
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
  }): RegisteredUserResponse {
    return {
      userId: data.userId,
      email: data.email,
      name: data.name,
      role: data.role,
    }
  }
}
