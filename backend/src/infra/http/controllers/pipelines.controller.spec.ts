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
import { PipelinesController } from './pipelines.controller'
import { CreatePipelineUseCase } from '@/domain/pipelines/application/use-cases/create-pipeline/create-pipeline.use-case'
import { UpdatePipelineUseCase } from '@/domain/pipelines/application/use-cases/update-pipeline/update-pipeline.use-case'
import { DeletePipelineUseCase } from '@/domain/pipelines/application/use-cases/delete-pipeline/delete-pipeline.use-case'
import { ListPipelinesUseCase } from '@/domain/pipelines/application/use-cases/list-pipelines/list-pipelines.use-case'
import { CreateStageUseCase } from '@/domain/pipelines/application/use-cases/create-stage/create-stage.use-case'
import { ListStagesUseCase } from '@/domain/pipelines/application/use-cases/list-stages/list-stages.use-case'
import { right, left } from '@/core/errors/either'
import { PipelineNotFoundError } from '@/domain/pipelines/application/errors/pipeline-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { GlobalExceptionFilter } from '@/infra/filters/http-exception.filter'

const mockCreate       = { execute: vi.fn() }
const mockUpdate       = { execute: vi.fn() }
const mockDelete       = { execute: vi.fn() }
const mockList         = { execute: vi.fn() }
const mockCreateStage  = { execute: vi.fn() }
const mockListStages   = { execute: vi.fn() }

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
    controllers: [PipelinesController],
    providers: [
      { provide: CreatePipelineUseCase, useValue: mockCreate },
      { provide: UpdatePipelineUseCase, useValue: mockUpdate },
      { provide: DeletePipelineUseCase, useValue: mockDelete },
      { provide: ListPipelinesUseCase,  useValue: mockList },
      { provide: CreateStageUseCase,    useValue: mockCreateStage },
      { provide: ListStagesUseCase,     useValue: mockListStages },
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

describe('PipelinesController (unit)', () => {
  let app: INestApplication

  afterEach(async () => { await app?.close() })
  beforeEach(() => vi.clearAllMocks())

  // ─── GET /pipelines ──────────────────────────────────────────────────────────

  describe('GET /pipelines', () => {
    it('returns 200 with pipeline list', async () => {
      app = await buildApp()
      const pipelines = [{ id: 'p-1', name: 'Sales' }, { id: 'p-2', name: 'Support' }]
      mockList.execute.mockResolvedValue(right(pipelines))

      const res = await request(app.getHttpServer()).get('/pipelines')

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body).toHaveLength(2)
      expect(mockList.execute).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-1' }),
      )
    })
  })

  // ─── POST /pipelines ─────────────────────────────────────────────────────────

  describe('POST /pipelines', () => {
    it('returns 201 when ACCOUNT_ADMIN creates a pipeline', async () => {
      app = await buildApp('ACCOUNT_ADMIN')
      mockCreate.execute.mockResolvedValue(right({ pipelineId: 'p-1' }))

      const res = await request(app.getHttpServer())
        .post('/pipelines')
        .send({ name: 'New Pipeline' })

      expect(res.status).toBe(HttpStatus.CREATED)
      expect(res.body.id).toBe('p-1')
    })

    it('returns 403 when MEMBER tries to create a pipeline', async () => {
      app = await buildApp('MEMBER')
      mockCreate.execute.mockResolvedValue(
        left(new UnauthorizedError('Only ACCOUNT_ADMIN or higher can manage pipelines')),
      )

      const res = await request(app.getHttpServer())
        .post('/pipelines')
        .send({ name: 'New Pipeline' })

      expect(res.status).toBe(HttpStatus.FORBIDDEN)
    })

    it('returns 400 when body is invalid', async () => {
      app = await buildApp()
      const res = await request(app.getHttpServer())
        .post('/pipelines')
        .send({ name: 'X' }) // too short
      expect(res.status).toBe(HttpStatus.BAD_REQUEST)
    })
  })

  // ─── PATCH /pipelines/:id ─────────────────────────────────────────────────────

  describe('PATCH /pipelines/:id', () => {
    it('returns 200 when pipeline is updated', async () => {
      app = await buildApp()
      const updated = { id: 'p-1', name: 'Updated Pipeline' }
      mockUpdate.execute.mockResolvedValue(right(updated))

      const res = await request(app.getHttpServer())
        .patch('/pipelines/p-1')
        .send({ name: 'Updated Pipeline' })

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body.name).toBe('Updated Pipeline')
    })

    it('returns 404 when pipeline is not found', async () => {
      app = await buildApp()
      mockUpdate.execute.mockResolvedValue(left(new PipelineNotFoundError()))

      const res = await request(app.getHttpServer())
        .patch('/pipelines/nonexistent')
        .send({ name: 'Updated Pipeline' })

      expect(res.status).toBe(HttpStatus.NOT_FOUND)
    })
  })

  // ─── DELETE /pipelines/:id ────────────────────────────────────────────────────

  describe('DELETE /pipelines/:id', () => {
    it('returns 204 when pipeline is deleted', async () => {
      app = await buildApp('ACCOUNT_ADMIN')
      mockDelete.execute.mockResolvedValue(right(undefined))

      const res = await request(app.getHttpServer()).delete('/pipelines/p-1')

      expect(res.status).toBe(HttpStatus.NO_CONTENT)
    })

    it('returns 403 when MEMBER tries to delete', async () => {
      app = await buildApp('MEMBER')
      mockDelete.execute.mockResolvedValue(
        left(new UnauthorizedError('Only ACCOUNT_ADMIN or higher can manage pipelines')),
      )

      const res = await request(app.getHttpServer()).delete('/pipelines/p-1')

      expect(res.status).toBe(HttpStatus.FORBIDDEN)
    })
  })

  // ─── GET /pipelines/:id/stages ────────────────────────────────────────────────

  describe('GET /pipelines/:id/stages', () => {
    it('returns 200 with stages list', async () => {
      app = await buildApp()
      const stages = [{ id: 's-1', name: 'Qualification' }, { id: 's-2', name: 'Proposal' }]
      mockListStages.execute.mockResolvedValue(right(stages))

      const res = await request(app.getHttpServer()).get('/pipelines/p-1/stages')

      expect(res.status).toBe(HttpStatus.OK)
      expect(res.body).toHaveLength(2)
      expect(mockListStages.execute).toHaveBeenCalledWith(
        expect.objectContaining({ pipelineId: 'p-1', tenantId: 'tenant-1' }),
      )
    })
  })

  // ─── POST /pipelines/:id/stages ───────────────────────────────────────────────

  describe('POST /pipelines/:id/stages', () => {
    it('returns 201 when ACCOUNT_ADMIN creates a stage', async () => {
      app = await buildApp('ACCOUNT_ADMIN')
      mockCreateStage.execute.mockResolvedValue(right({ stageId: 's-1' }))

      const res = await request(app.getHttpServer())
        .post('/pipelines/p-1/stages')
        .send({ name: 'Qualification' })

      expect(res.status).toBe(HttpStatus.CREATED)
      expect(res.body.id).toBe('s-1')
    })

    it('returns 403 when MEMBER tries to create a stage', async () => {
      app = await buildApp('MEMBER')
      mockCreateStage.execute.mockResolvedValue(
        left(new UnauthorizedError('Only ACCOUNT_ADMIN or higher can manage pipelines')),
      )

      const res = await request(app.getHttpServer())
        .post('/pipelines/p-1/stages')
        .send({ name: 'Qualification' })

      expect(res.status).toBe(HttpStatus.FORBIDDEN)
    })
  })
})
