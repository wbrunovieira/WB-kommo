import { describe, it, expect, beforeEach } from 'vitest'
import { RefreshTokenUseCase } from './refresh-token.use-case'
import { InMemoryUserSessionRepository } from '@/test/repositories/in-memory-user-session.repository'
import { SessionToken } from '@/domain/auth/enterprise/value-objects/session-token.vo'
import { UserSession } from '@/domain/auth/enterprise/entities/user-session.entity'
import { SessionNotFoundError } from '../errors/session-not-found.error'

function makeActiveSession(overrides: { expiresInMs?: number; role?: string } = {}) {
  const token = SessionToken.generate()
  const expiresAt = new Date(Date.now() + (overrides.expiresInMs ?? 60000))
  return { session: UserSession.create({
    tenantId: 'tenant-1',
    identityId: 'identity-1',
    refreshToken: token,
    expiresAt,
    isImpersonation: false,
    role: overrides.role ?? 'ACCOUNT_ADMIN',
  }), rawToken: token.rawToken! }
}

describe('RefreshTokenUseCase', () => {
  let sut: RefreshTokenUseCase
  let sessionRepo: InMemoryUserSessionRepository

  beforeEach(() => {
    sessionRepo = new InMemoryUserSessionRepository()
    sut = new RefreshTokenUseCase(sessionRepo)
  })

  it('should return new tokens for a valid refresh token', async () => {
    const { session, rawToken } = makeActiveSession()
    sessionRepo.items.push(session)

    const result = await sut.execute({ refreshToken: rawToken })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value).toHaveProperty('accessToken')
      expect(result.value).toHaveProperty('refreshToken')
      expect(result.value.refreshToken).not.toBe(rawToken)
    }
  })

  it('should return the role from the original session', async () => {
    const { session, rawToken } = makeActiveSession({ role: 'PLATFORM_OWNER' })
    sessionRepo.items.push(session)

    const result = await sut.execute({ refreshToken: rawToken })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.role).toBe('PLATFORM_OWNER')
    }
  })

  it('should rotate the refresh token (old token becomes invalid)', async () => {
    const { session, rawToken } = makeActiveSession()
    sessionRepo.items.push(session)

    await sut.execute({ refreshToken: rawToken })

    const old = sessionRepo.items.find((s) => s.refreshToken.hash === session.refreshToken.hash)
    expect(old?.isValid()).toBe(false)
  })

  it('should return SessionNotFoundError for unknown token', async () => {
    const result = await sut.execute({ refreshToken: 'unknown-token' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(SessionNotFoundError)
  })

  it('should return SessionNotFoundError for expired session', async () => {
    const { session, rawToken } = makeActiveSession({ expiresInMs: -1000 })
    sessionRepo.items.push(session)

    const result = await sut.execute({ refreshToken: rawToken })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(SessionNotFoundError)
  })
})
