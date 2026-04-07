import { describe, it, expect, beforeEach } from 'vitest'
import { LogoutUseCase } from './logout.use-case'
import { InMemoryUserSessionRepository } from '@/test/repositories/in-memory-user-session.repository'
import { SessionToken } from '@/domain/auth/enterprise/value-objects/session-token.vo'
import { UserSession } from '@/domain/auth/enterprise/entities/user-session.entity'

describe('LogoutUseCase', () => {
  let sut: LogoutUseCase
  let sessionRepo: InMemoryUserSessionRepository

  beforeEach(() => {
    sessionRepo = new InMemoryUserSessionRepository()
    sut = new LogoutUseCase(sessionRepo)
  })

  it('should revoke all active sessions for a user', async () => {
    const makeSession = () => UserSession.create({
      tenantId: 'tenant-1',
      identityId: 'identity-1',
      refreshToken: SessionToken.generate(),
      expiresAt: new Date(Date.now() + 60000),
      isImpersonation: false,
    })

    sessionRepo.items.push(makeSession(), makeSession())

    const result = await sut.execute({ identityId: 'identity-1' })

    expect(result.isRight()).toBe(true)
    expect(sessionRepo.items.every((s) => !s.isValid())).toBe(true)
  })

  it('should succeed even when user has no active sessions', async () => {
    const result = await sut.execute({ identityId: 'identity-ghost' })
    expect(result.isRight()).toBe(true)
  })
})
