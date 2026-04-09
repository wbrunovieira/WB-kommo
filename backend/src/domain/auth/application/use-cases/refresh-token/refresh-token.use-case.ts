import { createHash } from 'crypto'
import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IUserSessionRepository } from '../../repositories/i-user-session.repository'
import { UserSession } from '../../../enterprise/entities/user-session.entity'
import { SessionToken } from '../../../enterprise/value-objects/session-token.vo'
import { SessionNotFoundError } from '../errors/session-not-found.error'

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
  userId: string
  tenantId: string
  role: string
}

export type RefreshTokenResult = Either<SessionNotFoundError, RefreshTokenResponse>

@Injectable()
export class RefreshTokenUseCase {
  constructor(private readonly sessionRepo: IUserSessionRepository) {}

  async execute(request: RefreshTokenRequest): Promise<RefreshTokenResult> {
    const hash = createHash('sha256').update(request.refreshToken).digest('hex')

    const sessionResult = await this.sessionRepo.findByRefreshTokenHash(hash)
    if (sessionResult.isLeft()) return left(new SessionNotFoundError())
    const session = sessionResult.value
    if (!session || !session.isValid()) return left(new SessionNotFoundError())

    // Rotate: revoke old, create new
    session.revoke()
    await this.sessionRepo.save(session)

    const newToken = SessionToken.generate()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const newSession = UserSession.create({
      tenantId: session.tenantId,
      identityId: session.identityId,
      refreshToken: newToken,
      isImpersonation: session.isImpersonation,
      impersonatorId: session.impersonatorId,
      expiresAt,
    })
    await this.sessionRepo.save(newSession)

    return right({
      accessToken: `access_${session.identityId}`,
      refreshToken: newToken.rawToken!,
      userId: session.identityId,
      tenantId: session.tenantId,
      role: session.role,
    })
  }
}
