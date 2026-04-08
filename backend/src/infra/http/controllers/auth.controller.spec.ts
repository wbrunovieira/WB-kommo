import { Test, TestingModule } from '@nestjs/testing'
import { CanActivate, ExecutionContext, HttpStatus, INestApplication, Injectable, ValidationPipe } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { AuthController } from './auth.controller'
import { RegisterUserUseCase } from '@/domain/auth/application/use-cases/register-user/register-user.use-case'
import { AuthenticateUserUseCase } from '@/domain/auth/application/use-cases/authenticate-user/authenticate-user.use-case'
import { RefreshTokenUseCase } from '@/domain/auth/application/use-cases/refresh-token/refresh-token.use-case'
import { LogoutUseCase } from '@/domain/auth/application/use-cases/logout/logout.use-case'
import { ImpersonateUserUseCase } from '@/domain/auth/application/use-cases/impersonate-user/impersonate-user.use-case'
import { ITenantRepository } from '@/domain/tenants/application/repositories/i-tenant.repository'
import { right, left } from '@/core/errors/either'
import { InvalidCredentialsError } from '@/domain/auth/application/use-cases/errors/invalid-credentials.error'
import { AccountLockedError } from '@/domain/auth/application/use-cases/errors/account-locked.error'
import { UserAlreadyExistsError } from '@/domain/auth/application/use-cases/errors/user-already-exists.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { SessionNotFoundError } from '@/domain/auth/application/use-cases/errors/session-not-found.error'
import { GlobalExceptionFilter } from '@/infra/filters/http-exception.filter'
import { APP_FILTER, APP_GUARD, Reflector } from '@nestjs/core'

const MOCK_USER = { sub: 'uid-1', tenantId: 'tenant-1', role: 'RESELLER' }

@Injectable()
class MockAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    ctx.switchToHttp().getRequest().user = MOCK_USER
    return true
  }
}

const mockRegister     = { execute: vi.fn() }
const mockAuthenticate = { execute: vi.fn() }
const mockRefresh      = { execute: vi.fn() }
const mockLogout       = { execute: vi.fn() }
const mockImpersonate  = { execute: vi.fn() }
const mockJwt          = { sign: vi.fn().mockReturnValue('signed.jwt.token') }
const mockTenantRepo   = { findBySlug: vi.fn() }

async function buildApp(): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      { provide: RegisterUserUseCase,     useValue: mockRegister },
      { provide: AuthenticateUserUseCase, useValue: mockAuthenticate },
      { provide: RefreshTokenUseCase,     useValue: mockRefresh },
      { provide: LogoutUseCase,           useValue: mockLogout },
      { provide: ImpersonateUserUseCase,  useValue: mockImpersonate },
      { provide: ITenantRepository,       useValue: mockTenantRepo },
      { provide: JwtService,              useValue: mockJwt },
      { provide: APP_FILTER, useClass: GlobalExceptionFilter },
      { provide: APP_GUARD,  useClass: MockAuthGuard },
      Reflector,
    ],
  }).compile()

  const app = module.createNestApplication()
  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  await app.init()
  return app
}

describe('AuthController (unit)', () => {
  let app: INestApplication

  beforeAll(async () => { app = await buildApp() })
  afterAll(async ()  => { await app.close() })
  beforeEach(() => {
    vi.clearAllMocks()
    mockJwt.sign.mockReturnValue('signed.jwt.token')
  })

  // ─── POST /auth/register ────────────────────────────────────────────────────

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
      expect(res.body).toMatchObject({ userId: 'uid-1', email: 'alice@example.com' })
    })

    it('returns 409 when email already exists', async () => {
      mockRegister.execute.mockResolvedValue(left(new UserAlreadyExistsError()))
      const res = await request(app.getHttpServer()).post('/auth/register').send(validBody)
      expect(res.status).toBe(HttpStatus.CONFLICT)
    })

    it('returns 400 when body is invalid', async () => {
      const res = await request(app.getHttpServer()).post('/auth/register').send({ email: 'bad' })
      expect(res.status).toBe(HttpStatus.BAD_REQUEST)
    })
  })

  // ─── POST /auth/login ───────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    const validBody = { workspace: 'acme-corp', email: 'alice@example.com', password: 'Secret@123' }

    it('sets httpOnly cookie with refresh token and returns accessToken in body', async () => {
      mockTenantRepo.findBySlug.mockResolvedValue(right({ id: 'tenant-1', isActive: true }))
      mockAuthenticate.execute.mockResolvedValue(
        right({ refreshToken: 'raw-refresh', userId: 'uid-1', tenantId: 'tenant-1', role: 'ACCOUNT_ADMIN' }),
      )

      const res = await request(app.getHttpServer()).post('/auth/login').send(validBody)

      expect(res.status).toBe(HttpStatus.OK)
      // access token in body
      expect(res.body.accessToken).toBe('signed.jwt.token')
      expect(res.body.tokenType).toBe('Bearer')
      // refresh token NOT in body
      expect(res.body.refreshToken).toBeUndefined()
      // refresh token in httpOnly cookie
      const cookie = res.headers['set-cookie'] as unknown as string[]
      expect(cookie).toBeDefined()
      expect(cookie[0]).toContain('wb_refresh_token=raw-refresh')
      expect(cookie[0]).toContain('HttpOnly')
      expect(cookie[0]).toContain('Path=/auth')
    })

    it('returns 404 when workspace does not exist', async () => {
      mockTenantRepo.findBySlug.mockResolvedValue(right(null))
      const res = await request(app.getHttpServer()).post('/auth/login').send(validBody)
      expect(res.status).toBe(HttpStatus.NOT_FOUND)
      expect(mockAuthenticate.execute).not.toHaveBeenCalled()
    })

    it('returns 401 on invalid credentials', async () => {
      mockTenantRepo.findBySlug.mockResolvedValue(right({ id: 'tenant-1', isActive: true }))
      mockAuthenticate.execute.mockResolvedValue(left(new InvalidCredentialsError()))
      const res = await request(app.getHttpServer()).post('/auth/login').send(validBody)
      expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    })

    it('returns 423 when account is locked', async () => {
      mockTenantRepo.findBySlug.mockResolvedValue(right({ id: 'tenant-1', isActive: true }))
      mockAuthenticate.execute.mockResolvedValue(
        left(new AccountLockedError(new Date(Date.now() + 15 * 60 * 1000))),
      )
      const res = await request(app.getHttpServer()).post('/auth/login').send(validBody)
      expect(res.status).toBe(423)
    })

    it('returns 400 when body is missing required fields', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({ email: 'alice@example.com' })
      expect(res.status).toBe(HttpStatus.BAD_REQUEST)
    })
  })

  // ─── POST /auth/refresh ─────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('reads refresh token from cookie, rotates it and returns new accessToken', async () => {
      mockRefresh.execute.mockResolvedValue(
        right({ refreshToken: 'new-refresh', userId: 'uid-1', tenantId: 'tenant-1' }),
      )

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'wb_refresh_token=old-raw-token')

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body.accessToken).toBe('signed.jwt.token')
      expect(res.body.refreshToken).toBeUndefined()
      expect(mockRefresh.execute).toHaveBeenCalledWith({ refreshToken: 'old-raw-token' })
      // new cookie set
      const cookie = res.headers['set-cookie'] as unknown as string[]
      expect(cookie[0]).toContain('wb_refresh_token=new-refresh')
      expect(cookie[0]).toContain('HttpOnly')
    })

    it('returns 401 when cookie is missing', async () => {
      const res = await request(app.getHttpServer()).post('/auth/refresh')
      expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
      expect(mockRefresh.execute).not.toHaveBeenCalled()
    })

    it('returns 401 when session is invalid', async () => {
      mockRefresh.execute.mockResolvedValue(left(new SessionNotFoundError()))
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'wb_refresh_token=expired-token')
      expect(res.status).toBe(HttpStatus.UNAUTHORIZED)
    })
  })

  // ─── POST /auth/logout ──────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('revokes session and clears the refresh token cookie', async () => {
      mockLogout.execute.mockResolvedValue(right(undefined))

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', 'wb_refresh_token=some-token')

      expect(res.status).toBe(HttpStatus.NO_CONTENT)
      expect(mockLogout.execute).toHaveBeenCalledWith({ identityId: 'uid-1' })
      const cookie = res.headers['set-cookie'] as unknown as string[]
      expect(cookie[0]).toContain('wb_refresh_token=;')
    })
  })

  // ─── POST /auth/impersonate/:tenantId ───────────────────────────────────────

  describe('POST /auth/impersonate/:tenantId', () => {
    it('returns 200 with impersonation tokens', async () => {
      mockImpersonate.execute.mockResolvedValue(
        right({ refreshToken: 'imp-refresh', sessionId: 'session-id-1' }),
      )
      const res = await request(app.getHttpServer()).post('/auth/impersonate/tenant-2')
      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body.accessToken).toBe('signed.jwt.token')
    })

    it('returns 403 when actor cannot impersonate', async () => {
      mockImpersonate.execute.mockResolvedValue(left(new UnauthorizedError('Only RESELLER')))
      const res = await request(app.getHttpServer()).post('/auth/impersonate/tenant-2')
      expect(res.status).toBe(HttpStatus.FORBIDDEN)
    })
  })
})
