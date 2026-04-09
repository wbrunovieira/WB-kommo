import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  INestApplication,
  Injectable,
  ValidationPipe,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { APP_FILTER, APP_GUARD, Reflector } from '@nestjs/core'
import request from 'supertest'
import { LeadsController } from './leads.controller'
import { CreateLeadUseCase } from '@/domain/leads/application/use-cases/create-lead/create-lead.use-case'
import { ListLeadsUseCase } from '@/domain/leads/application/use-cases/list-leads/list-leads.use-case'
import { GetLeadUseCase } from '@/domain/leads/application/use-cases/get-lead/get-lead.use-case'
import { UpdateLeadUseCase } from '@/domain/leads/application/use-cases/update-lead/update-lead.use-case'
import { SoftDeleteLeadUseCase } from '@/domain/leads/application/use-cases/soft-delete-lead/soft-delete-lead.use-case'
import { RestoreLeadUseCase } from '@/domain/leads/application/use-cases/restore-lead/restore-lead.use-case'
import { right, left } from '@/core/errors/either'
import { LeadNotFoundError } from '@/domain/leads/application/errors/lead-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { PlanLimitExceededError } from '@/domain/leads/application/errors/plan-limit-exceeded.error'
import { GlobalExceptionFilter } from '@/infra/filters/http-exception.filter'

const mockCreate     = { execute: vi.fn() }
const mockList       = { execute: vi.fn() }
const mockGet        = { execute: vi.fn() }
const mockUpdate     = { execute: vi.fn() }
const mockSoftDelete = { execute: vi.fn() }
const mockRestore    = { execute: vi.fn() }

function makeGuard(role: string, tenantId = 'tenant-1', sub = 'user-1') {
  @Injectable()
  class MockGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
      ctx.switchToHttp().getRequest().user = { sub, tenantId, role }
      return true
    }
  }
  return MockGuard
}

async function buildApp(
  role = 'ACCOUNT_ADMIN',
  tenantId = 'tenant-1',
  sub = 'user-1',
): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [LeadsController],
    providers: [
      { provide: CreateLeadUseCase,     useValue: mockCreate },
      { provide: ListLeadsUseCase,      useValue: mockList },
      { provide: GetLeadUseCase,        useValue: mockGet },
      { provide: UpdateLeadUseCase,     useValue: mockUpdate },
      { provide: SoftDeleteLeadUseCase, useValue: mockSoftDelete },
      { provide: RestoreLeadUseCase,    useValue: mockRestore },
      { provide: APP_FILTER, useClass: GlobalExceptionFilter },
      { provide: APP_GUARD,  useClass: makeGuard(role, tenantId, sub) },
      Reflector,
    ],
  }).compile()

  const app = module.createNestApplication()
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  await app.init()
  return app
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LeadsController (unit)', () => {
  let app: INestApplication

  afterEach(async () => { await app?.close() })
  beforeEach(() => vi.clearAllMocks())

  // ─── POST /leads ────────────────────────────────────────────────────────────

  describe('POST /leads', () => {
    const validBody = {
      name: 'Acme Corp Deal',
      pipelineId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      stageId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    }

    it('returns 201 when lead is created successfully', async () => {
      app = await buildApp()
      mockCreate.execute.mockResolvedValue(right({ leadId: 'lead-uuid' }))

      const res = await request(app.getHttpServer()).post('/leads').send(validBody)

      expect(res.status).toBe(HttpStatus.CREATED)
      expect(res.body.id).toBe('lead-uuid')
      expect(mockCreate.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'Acme Corp Deal',
        }),
      )
    })

    it('returns 422 when plan lead limit is exceeded', async () => {
      app = await buildApp()
      mockCreate.execute.mockResolvedValue(left(new PlanLimitExceededError()))

      const res = await request(app.getHttpServer()).post('/leads').send(validBody)

      expect(res.status).toBe(HttpStatus.UNPROCESSABLE_ENTITY)
    })

    it('returns 400 when body is invalid', async () => {
      app = await buildApp()
      const res = await request(app.getHttpServer()).post('/leads').send({ name: 'Only name' })
      expect(res.status).toBe(HttpStatus.BAD_REQUEST)
    })
  })

  // ─── GET /leads ──────────────────────────────────────────────────────────────

  describe('GET /leads', () => {
    it('returns 200 with leads list', async () => {
      app = await buildApp()
      const leads = [{ id: 'lead-1' }, { id: 'lead-2' }]
      mockList.execute.mockResolvedValue(right(leads))

      const res = await request(app.getHttpServer()).get('/leads')

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body).toHaveLength(2)
    })
  })

  // ─── GET /leads/:id ──────────────────────────────────────────────────────────

  describe('GET /leads/:id', () => {
    it('returns 200 with lead data', async () => {
      app = await buildApp()
      const lead = { id: 'lead-1', name: 'Acme Deal' }
      mockGet.execute.mockResolvedValue(right(lead))

      const res = await request(app.getHttpServer()).get('/leads/lead-1')

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body.id).toBe('lead-1')
    })

    it('returns 404 when lead is not found', async () => {
      app = await buildApp()
      mockGet.execute.mockResolvedValue(left(new LeadNotFoundError()))

      const res = await request(app.getHttpServer()).get('/leads/nonexistent')

      expect(res.status).toBe(HttpStatus.NOT_FOUND)
    })

    it('returns 403 when member is unauthorized to view lead', async () => {
      app = await buildApp('MEMBER')
      mockGet.execute.mockResolvedValue(
        left(new UnauthorizedError('You do not have permission to view this lead')),
      )

      const res = await request(app.getHttpServer()).get('/leads/lead-1')

      expect(res.status).toBe(HttpStatus.FORBIDDEN)
    })
  })

  // ─── PATCH /leads/:id ────────────────────────────────────────────────────────

  describe('PATCH /leads/:id', () => {
    it('returns 200 with updated lead', async () => {
      app = await buildApp()
      const updated = { id: 'lead-1', name: 'Updated Name' }
      mockUpdate.execute.mockResolvedValue(right(updated))

      const res = await request(app.getHttpServer())
        .patch('/leads/lead-1')
        .send({ name: 'Updated Name' })

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body.name).toBe('Updated Name')
    })

    it('returns 403 when member is unauthorized to edit lead', async () => {
      app = await buildApp('MEMBER')
      mockUpdate.execute.mockResolvedValue(
        left(new UnauthorizedError('You do not have permission to edit this lead')),
      )

      const res = await request(app.getHttpServer())
        .patch('/leads/lead-1')
        .send({ name: 'Updated Name' })

      expect(res.status).toBe(HttpStatus.FORBIDDEN)
    })
  })

  // ─── DELETE /leads/:id ───────────────────────────────────────────────────────

  describe('DELETE /leads/:id', () => {
    it('returns 204 when lead is soft deleted', async () => {
      app = await buildApp('ACCOUNT_ADMIN')
      mockSoftDelete.execute.mockResolvedValue(right(undefined))

      const res = await request(app.getHttpServer()).delete('/leads/lead-1')

      expect(res.status).toBe(HttpStatus.NO_CONTENT)
    })

    it('returns 403 when MEMBER tries to delete', async () => {
      app = await buildApp('MEMBER')
      mockSoftDelete.execute.mockResolvedValue(
        left(new UnauthorizedError('Only ACCOUNT_ADMIN can delete leads')),
      )

      const res = await request(app.getHttpServer()).delete('/leads/lead-1')

      expect(res.status).toBe(HttpStatus.FORBIDDEN)
    })
  })

  // ─── POST /leads/:id/restore ─────────────────────────────────────────────────

  describe('POST /leads/:id/restore', () => {
    it('returns 200 when lead is restored', async () => {
      app = await buildApp('ACCOUNT_ADMIN')
      mockRestore.execute.mockResolvedValue(right(undefined))

      const res = await request(app.getHttpServer()).post('/leads/lead-1/restore')

      expect(res.status).toBe(HttpStatus.OK)
    })

    it('returns 403 when MEMBER tries to restore', async () => {
      app = await buildApp('MEMBER')
      mockRestore.execute.mockResolvedValue(
        left(new UnauthorizedError('Only ACCOUNT_ADMIN can restore leads')),
      )

      const res = await request(app.getHttpServer()).post('/leads/lead-1/restore')

      expect(res.status).toBe(HttpStatus.FORBIDDEN)
    })
  })
})
