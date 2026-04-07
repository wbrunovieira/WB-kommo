import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IUserAuthorizationRepository } from '../../repositories/i-user-authorization.repository'
import { IUserSessionRepository } from '../../repositories/i-user-session.repository'
import { UserSession } from '../../../enterprise/entities/user-session.entity'
import { SessionToken } from '../../../enterprise/value-objects/session-token.vo'
import { UnauthorizedError } from '../errors/unauthorized.error'

export interface ImpersonateUserRequest {
  resellerId: string
  targetTenantId: string
  ipAddress?: string
  userAgent?: string
}

export interface ImpersonateUserResponse {
  accessToken: string
  refreshToken: string
  sessionId: string
}

export type ImpersonateUserResult = Either<UnauthorizedError, ImpersonateUserResponse>

@Injectable()
export class ImpersonateUserUseCase {
  constructor(
    private readonly authorizationRepo: IUserAuthorizationRepository,
    private readonly sessionRepo: IUserSessionRepository,
  ) {}

  async execute(request: ImpersonateUserRequest): Promise<ImpersonateUserResult> {
    // 1. Verify actor is RESELLER
    const authResult = await this.authorizationRepo.findByIdentityId(request.resellerId)
    if (authResult.isLeft() || !authResult.value) {
      return left(new UnauthorizedError('Actor not found'))
    }

    const authorization = authResult.value
    if (!authorization.role.canImpersonate()) {
      return left(new UnauthorizedError('Only RESELLER can impersonate'))
    }

    // 2. Create impersonation session (short-lived: 30min)
    const refreshToken = SessionToken.generate()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 30)

    const session = UserSession.create({
      tenantId: request.targetTenantId,
      identityId: request.resellerId,
      refreshToken,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      isImpersonation: true,
      impersonatorId: request.resellerId,
      expiresAt,
    })

    await this.sessionRepo.save(session)

    return right({
      accessToken: `impersonation_access_${request.resellerId}_${request.targetTenantId}`,
      refreshToken: refreshToken.rawToken!,
      sessionId: session.id.toString(),
    })
  }
}
