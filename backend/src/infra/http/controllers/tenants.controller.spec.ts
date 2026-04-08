import { Test, TestingModule } from '@nestjs/testing'
import { CanActivate, ExecutionContext, HttpStatus, INestApplication, Injectable, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import { APP_FILTER, APP_GUARD, Reflector } from '@nestjs/core'
import { TenantsController } from './tenants.controller'
import { CreateTenantUseCase } from '@/domain/tenants/application/use-cases/create-tenant/create-tenant.use-case'
import { ListTenantsUseCase } from '@/domain/tenants/application/use-cases/list-tenants/list-tenants.use-case'
import { right, left } from '@/core/errors/either'
import { TenantSlugTakenError } from '@/domain/tenants/application/use-cases/errors/tenant-slug-taken.error'
import { GlobalExceptionFilter } from '@/infra/filters/http-exception.filter'

const mockCreate = { execute: vi.fn() }
const mockList   = { execute: vi.fn() }

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeGuard(role: string, tenantId = 'actor-tenant') {
  @Injectable()
  class MockGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
      ctx.switchToHttp().getRequest().user = { sub: 'actor-id', tenantId, role }
      return true
    }
  }
  return MockGuard
}

async function buildApp(role = 'RESELLER', tenantId = 'actor-tenant'): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [TenantsController],
    providers: [
      { provide: CreateTenantUseCase, useValue: mockCreate },
      { provide: ListTenantsUseCase,  useValue: mockList },
      { provide: APP_FILTER, useClass: GlobalExceptionFilter },
      { provide: APP_GUARD,  useClass: makeGuard(role, tenantId) },
      Reflector,
    ],
  }).compile()

  const app = module.createNestApplication()
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  await app.init()
  return app
}

// ─── POST /tenants ────────────────────────────────────────────────────────────

describe('TenantsController (unit)', () => {
  let app: INestApplication

  afterEach(async () => { await app?.close() })
  beforeEach(() => vi.clearAllMocks())

  describe('POST /tenants', () => {
    const validBody = { name: 'Acme Corp', slug: 'acme-corp' }

    it('returns 201 with tenant data on success (RESELLER)', async () => {
      app = await buildApp('RESELLER', 'reseller-tenant')
      mockCreate.execute.mockResolvedValue(
        right({ id: 'new-tid', name: 'Acme Corp', slug: 'acme-corp', resellerTenantId: 'reseller-tenant' }),
      )

      const res = await request(app.getHttpServer()).post('/tenants').send(validBody)

      expect(res.status).toBe(HttpStatus.CREATED)
      expect(res.body.slug).toBe('acme-corp')
      expect(mockCreate.execute).toHaveBeenCalledWith(
        expect.objectContaining({ resellerTenantId: 'reseller-tenant' }),
      )
    })

    it('returns 201 for PLATFORM_OWNER with no resellerTenantId (creates reseller)', async () => {
      app = await buildApp('PLATFORM_OWNER')
      mockCreate.execute.mockResolvedValue(
        right({ id: 'new-tid', name: 'Acme Corp', slug: 'acme-corp', resellerTenantId: null }),
      )

      const res = await request(app.getHttpServer()).post('/tenants').send(validBody)

      expect(res.status).toBe(HttpStatus.CREATED)
      expect(mockCreate.execute).toHaveBeenCalledWith(
        expect.objectContaining({ resellerTenantId: null }),
      )
    })

    it('returns 409 when slug is taken', async () => {
      app = await buildApp('RESELLER')
      mockCreate.execute.mockResolvedValue(left(new TenantSlugTakenError('acme-corp')))

      const res = await request(app.getHttpServer()).post('/tenants').send(validBody)

      expect(res.status).toBe(HttpStatus.CONFLICT)
    })

    it('returns 400 when body is invalid', async () => {
      app = await buildApp('RESELLER')
      const res = await request(app.getHttpServer()).post('/tenants').send({ name: 'X' })
      expect(res.status).toBe(HttpStatus.BAD_REQUEST)
    })
  })

  // ─── GET /tenants ─────────────────────────────────────────────────────────

  describe('GET /tenants', () => {
    const clients = [
      { id: 'c-1', name: 'Client One', slug: 'client-one', isActive: true, resellerTenantId: 'actor-tenant' },
      { id: 'c-2', name: 'Client Two', slug: 'client-two', isActive: true, resellerTenantId: 'actor-tenant' },
    ]

    it('returns tenant list for RESELLER', async () => {
      app = await buildApp('RESELLER', 'actor-tenant')
      mockList.execute.mockResolvedValue(right(clients))

      const res = await request(app.getHttpServer()).get('/tenants')

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body).toHaveLength(2)
      expect(mockList.execute).toHaveBeenCalledWith(
        expect.objectContaining({ actorRole: 'RESELLER', actorTenantId: 'actor-tenant' }),
      )
    })

    it('returns tenant list for PLATFORM_OWNER', async () => {
      app = await buildApp('PLATFORM_OWNER', 'platform-tenant')
      mockList.execute.mockResolvedValue(right([...clients, { id: 'r-1', name: 'Other Reseller', slug: 'other', isActive: true, resellerTenantId: null }]))

      const res = await request(app.getHttpServer()).get('/tenants')

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body).toHaveLength(3)
      expect(mockList.execute).toHaveBeenCalledWith(
        expect.objectContaining({ actorRole: 'PLATFORM_OWNER', actorTenantId: 'platform-tenant' }),
      )
    })

    it('returns empty array when no tenants', async () => {
      app = await buildApp('RESELLER')
      mockList.execute.mockResolvedValue(right([]))

      const res = await request(app.getHttpServer()).get('/tenants')

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body).toHaveLength(0)
    })
  })
})
