import { Test, TestingModule } from '@nestjs/testing'
import { CanActivate, ExecutionContext, HttpStatus, INestApplication, Injectable, ValidationPipe } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import request from 'supertest'
import { AuthController } from './auth.controller'
import { RegisterUserUseCase } from '@/domain/auth/application/use-cases/register-user/register-user.use-case'
import { AuthenticateUserUseCase } from '@/domain/auth/application/use-cases/authenticate-user/authenticate-user.use-case'
import { RefreshTokenUseCase } from '@/domain/auth/application/use-cases/refresh-token/refresh-token.use-case'
import { LogoutUseCase } from '@/domain/auth/application/use-cases/logout/logout.use-case'
import { ImpersonateUserUseCase } from '@/domain/auth/application/use-cases/impersonate-user/impersonate-user.use-case'
import { right, left } from '@/core/errors/either'
import { InvalidCredentialsError } from '@/domain/auth/application/use-cases/errors/invalid-credentials.error'
import { AccountLockedError } from '@/domain/auth/application/use-cases/errors/account-locked.error'
import { UserAlreadyExistsError } from '@/domain/auth/application/use-cases/errors/user-already-exists.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { SessionNotFoundError } from '@/domain/auth/application/use-cases/errors/session-not-found.error'
import { GlobalExceptionFilter } from '@/infra/filters/http-exception.filter'
import { APP_FILTER, APP_GUARD, Reflector } from '@nestjs/core'

const MOCK_USER = { sub: 'uid-1', tenantId: 'tenant-1', role: 'RESELLER' }

// NestJS-level guard that sets request.user so @CurrentUser() resolves
@Injectable()
class MockAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    ctx.switchToHttp().getRequest().user = MOCK_USER
    return true
  }
}

const mockRegister = { execute: vi.fn() }
const mockAuthenticate = { execute: vi.fn() }
const mockRefresh = { execute: vi.fn() }
const mockLogout = { execute: vi.fn() }
const mockImpersonate = { execute: vi.fn() }
const mockJwt = { sign: vi.fn().mockReturnValue('signed.jwt.token') }

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      { provide: RegisterUserUseCase, useValue: mockRegister },
      { provide: AuthenticateUserUseCase, useValue: mockAuthenticate },
      { provide: RefreshTokenUseCase, useValue: mockRefresh },
      { provide: LogoutUseCase, useValue: mockLogout },
      { provide: ImpersonateUserUseCase, useValue: mockImpersonate },
      { provide: JwtService, useValue: mockJwt },
      { provide: APP_FILTER, useClass: GlobalExceptionFilter },
      { provide: APP_GUARD, useClass: MockAuthGuard },
      Reflector,
    ],
  }).compile()

  const app = module.createNestApplication()
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  await app.init()
  return app
}

describe('AuthController (unit)', () => {
  let app: INestApplication

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockJwt.sign.mockReturnValue('signed.jwt.token')
  })

  // ─── POST /auth/register ──────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    const validBody = {
      tenantId: 'tenant-1',
      name: 'Alice',
      email: 'alice@example.com',
      password: 'Secret@123',
      role: 'ACCOUNT_ADMIN',
    }

    it('returns 201 with user data on success', async () => {
      mockRegister.execute.mockResolvedValue(
        right({ userId: 'uid-1', email: 'alice@example.com', name: 'Alice', role: 'ACCOUNT_ADMIN' }),
      )

      const res = await request(app.getHttpServer()).post('/auth/register').send(validBody)

      expect(res.status).toBe(HttpStatus.CREATED)
      expect(res.body).toMatchObject({
        userId: 'uid-1',
        email: 'alice@example.com',
        name: 'Alice',
        role: 'ACCOUNT_ADMIN',
      })
    })

    it('returns 409 when email already exists', async () => {
      mockRegister.execute.mockResolvedValue(left(new UserAlreadyExistsError()))

      const res = await request(app.getHttpServer()).post('/auth/register').send(validBody)

      expect(res.status).toBe(HttpStatus.CONFLICT)
      expect(res.body.title).toBe('Email already registered in this tenant')
    })

    it('returns 400 when body is invalid', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email' })

      expect(res.status).toBe(HttpStatus.BAD_REQUEST)
    })
  })

  // ─── POST /auth/login ─────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    const validBody = {
      tenantId: 'tenant-1',
      email: 'alice@example.com',
      password: 'Secret@123',
    }

    it('returns 200 with tokens on success', async () => {
      mockAuthenticate.execute.mockResolvedValue(
        right({
          accessToken: 'access_uid-1',
          refreshToken: 'raw-refresh-token',
          userId: 'uid-1',
          tenantId: 'tenant-1',
          role: 'ACCOUNT_ADMIN',
        }),
      )

      const res = await request(app.getHttpServer()).post('/auth/login').send(validBody)

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body).toMatchObject({
        accessToken: 'signed.jwt.token',
        refreshToken: 'raw-refresh-token',
        tokenType: 'Bearer',
        userId: 'uid-1',
        tenantId: 'tenant-1',
        role: 'ACCOUNT_ADMIN',
      })
      expect(mockJwt.sign).toHaveBeenCalledWith({
        sub: 'uid-1',
        tenantId: 'tenant-1',
        role: 'ACCOUNT_ADMIN',
      })
    })

    it('returns 401 on invalid credentials', async () => {
      mockAuthenticate.execute.mockResolvedValue(left(new InvalidCredentialsError()))

      const res = await request(app.getHttpServer()).post('/auth/login').send(validBody)

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
      expect(res.body.title).toBe('Invalid credentials')
    })

    it('returns 423 when account is locked', async () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000)
      mockAuthenticate.execute.mockResolvedValue(left(new AccountLockedError(lockedUntil)))

      const res = await request(app.getHttpServer()).post('/auth/login').send(validBody)

      expect(res.status).toBe(423)
    })
  })

  // ─── POST /auth/logout ────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('returns 204 on success', async () => {
      mockLogout.execute.mockResolvedValue(right(undefined))

      const res = await request(app.getHttpServer()).post('/auth/logout')

      expect(res.status).toBe(HttpStatus.NO_CONTENT)
      expect(mockLogout.execute).toHaveBeenCalledWith({ identityId: 'uid-1' })
    })
  })

  // ─── POST /auth/refresh ───────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('returns 200 with new tokens', async () => {
      mockRefresh.execute.mockResolvedValue(
        right({
          accessToken: 'access_uid-1',
          refreshToken: 'new-refresh-token',
          userId: 'uid-1',
          tenantId: 'tenant-1',
        }),
      )

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'old-raw-token' })

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body.refreshToken).toBe('new-refresh-token')
      expect(res.body.accessToken).toBe('signed.jwt.token')
    })

    it('returns 401 when session is invalid', async () => {
      mockRefresh.execute.mockResolvedValue(left(new SessionNotFoundError()))

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'expired-token' })

      expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    })
  })

  // ─── POST /auth/impersonate/:tenantId ─────────────────────────────────────

  describe('POST /auth/impersonate/:tenantId', () => {
    it('returns 200 with impersonation tokens', async () => {
      mockImpersonate.execute.mockResolvedValue(
        right({
          accessToken: 'impersonation_access_uid-1_tenant-2',
          refreshToken: 'imp-refresh-token',
          sessionId: 'session-id-1',
        }),
      )

      const res = await request(app.getHttpServer())
        .post('/auth/impersonate/tenant-2')

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body.accessToken).toBe('signed.jwt.token')
    })

    it('returns 403 when actor cannot impersonate', async () => {
      mockImpersonate.execute.mockResolvedValue(
        left(new UnauthorizedError('Only RESELLER can impersonate')),
      )

      const res = await request(app.getHttpServer())
        .post('/auth/impersonate/tenant-2')

      expect(res.status).toBe(HttpStatus.FORBIDDEN)
    })
  })
})
