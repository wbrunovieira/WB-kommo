import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IUserAggregatedViewRepository } from '../../repositories/i-user-aggregated-view.repository'
import { IUserIdentityRepository } from '../../repositories/i-user-identity.repository'
import { IUserSessionRepository } from '../../repositories/i-user-session.repository'
import { UserSession } from '../../../enterprise/entities/user-session.entity'
import { SessionToken } from '../../../enterprise/value-objects/session-token.vo'
import { InvalidCredentialsError } from '../errors/invalid-credentials.error'
import { AccountLockedError } from '../errors/account-locked.error'

export interface AuthenticateUserRequest {
  tenantId: string
  email: string
  password: string
  ipAddress?: string
  userAgent?: string
}

export interface AuthenticateUserResponse {
  accessToken: string
  refreshToken: string
  userId: string
  tenantId: string
  role: string
}

export type AuthenticateUserResult = Either<
  InvalidCredentialsError | AccountLockedError,
  AuthenticateUserResponse
>

@Injectable()
export class AuthenticateUserUseCase {
  constructor(
    private readonly userViewRepo: IUserAggregatedViewRepository,
    private readonly identityRepo: IUserIdentityRepository,
    private readonly sessionRepo: IUserSessionRepository,
  ) {}

  async execute(request: AuthenticateUserRequest): Promise<AuthenticateUserResult> {
    // 1. Validate email format — invalid format = credentials error (never reveal if user exists)
    let normalizedEmail: string
    try {
      normalizedEmail = request.email.trim().toLowerCase()
      if (!normalizedEmail.includes('@')) throw new Error()
    } catch {
      return left(new InvalidCredentialsError())
    }

    // 2. Fetch aggregated user view
    const viewResult = await this.userViewRepo.findByEmail(request.tenantId, normalizedEmail)
    if (viewResult.isLeft()) return left(new InvalidCredentialsError())
    if (!viewResult.value) return left(new InvalidCredentialsError())

    const { identity, authorization } = viewResult.value

    // 3. Check account lock — rule in entity
    if (identity.isLocked()) {
      return left(new AccountLockedError(identity.lockedUntil!))
    }

    // 4. Verify password — rule in VO
    const isValid = await identity.password.compare(request.password)
    if (!isValid) {
      identity.incrementFailedAttempts()
      await this.identityRepo.save(identity)
      return left(new InvalidCredentialsError())
    }

    // 5. Reset attempts and record login — rule in entity
    identity.resetFailedAttempts()
    identity.recordLogin()
    await this.identityRepo.save(identity)

    // 6. Create session
    const refreshToken = SessionToken.generate()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const session = UserSession.create({
      tenantId: request.tenantId,
      identityId: identity.id.toString(),
      refreshToken,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
      expiresAt,
      isImpersonation: false,
    })

    await this.sessionRepo.save(session)

    // 7. Return tokens (JWT generation will be in infra layer — use case returns raw identifiers)
    return right({
      accessToken: `access_${identity.id.toString()}`,
      refreshToken: refreshToken.rawToken!,
      userId: identity.id.toString(),
      tenantId: request.tenantId,
      role: authorization.role.value,
    })
  }
}
