import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { AppModule } from '@/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

// ─── Setup helpers ────────────────────────────────────────────────────────────

async function seedPlan(prisma: PrismaService) {
  await prisma.plan.upsert({
    where: { id: 'e2e-plan-pipelines' },
    update: {},
    create: { id: 'e2e-plan-pipelines', name: 'Starter', maxUsers: 10, maxLeads: 100, price: 0 },
  })
}

async function seedTenant(prisma: PrismaService, tenantId: string) {
  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: { id: tenantId, name: tenantId, slug: tenantId, planId: 'e2e-plan-pipelines' },
  })
}

async function registerAndLogin(
  app: INestApplication,
  tenantId: string,
  email: string,
  role: string,
): Promise<string> {
  const regRes = await request(app.getHttpServer()).post('/auth/register').send({
    tenantId,
    name: 'Test User',
    email,
    password: 'Fixture#1a',
    role,
  })
  if (regRes.status !== 201) {
    throw new Error(`register failed [${regRes.status}]: ${JSON.stringify(regRes.body)}`)
  }
  const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
    workspace: tenantId,
    email,
    password: 'Fixture#1a',
  })
  if (loginRes.status !== 200) {
    throw new Error(`login failed [${loginRes.status}]: ${JSON.stringify(loginRes.body)}`)
  }
  return loginRes.body.accessToken as string
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('Pipelines routes (E2E)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const TENANT_ID = 'e2e-tenant-pipelines'

  let adminToken:  string
  let memberToken: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.use(cookieParser())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()

    prisma = module.get(PrismaService)

    await seedPlan(prisma)
    await seedTenant(prisma, TENANT_ID)

    adminToken  = await registerAndLogin(app, TENANT_ID, 'admin-pipelines@e2e.com',  'ACCOUNT_ADMIN')
    memberToken = await registerAndLogin(app, TENANT_ID, 'member-pipelines@e2e.com', 'MEMBER')
  })

  afterAll(async () => {
    await app.close()
  })

  // ─── GET /pipelines ───────────────────────────────────────────────────────────

  describe('GET /pipelines', () => {
    beforeAll(async () => {
      // Create a pipeline to ensure the list is not empty
      await request(app.getHttpServer())
        .post('/pipelines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Seeded Pipeline' })
    })

    it('200 — returns all pipelines for tenant', async () => {
      const res = await request(app.getHttpServer())
        .get('/pipelines')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
    })

    it('401 — unauthenticated rejected', async () => {
      const res = await request(app.getHttpServer()).get('/pipelines')
      expect(res.status).toBe(401)
    })
  })

  // ─── POST /pipelines ──────────────────────────────────────────────────────────

  describe('POST /pipelines', () => {
    it('201 — ACCOUNT_ADMIN creates pipeline', async () => {
      const res = await request(app.getHttpServer())
        .post('/pipelines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Sales Pipeline' })

      expect(res.status).toBe(201)
      expect(res.body.id).toBeDefined()
      expect(res.body.name).toBe('New Sales Pipeline')
    })

    it('400 — rejects missing name', async () => {
      const res = await request(app.getHttpServer())
        .post('/pipelines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})

      expect(res.status).toBe(400)
    })

    it('403 — MEMBER cannot create pipeline', async () => {
      const res = await request(app.getHttpServer())
        .post('/pipelines')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Forbidden Pipeline' })

      expect(res.status).toBe(403)
    })

    it('401 — unauthenticated rejected', async () => {
      const res = await request(app.getHttpServer())
        .post('/pipelines')
        .send({ name: 'Anon Pipeline' })

      expect(res.status).toBe(401)
    })
  })

  // ─── PATCH /pipelines/:id ─────────────────────────────────────────────────────

  describe('PATCH /pipelines/:id', () => {
    let pipeline: { id: string }

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/pipelines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Pipeline To Update' })
      pipeline = res.body
    })

    it('200 — ACCOUNT_ADMIN updates pipeline', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/pipelines/${pipeline.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Pipeline Name' })

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Updated Pipeline Name')
    })

    it('404 — pipeline not found', async () => {
      const res = await request(app.getHttpServer())
        .patch('/pipelines/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost Pipeline' })

      expect(res.status).toBe(404)
    })

    it('403 — MEMBER cannot update', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/pipelines/${pipeline.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Forbidden Update' })

      expect(res.status).toBe(403)
    })

    it('401 — unauthenticated rejected', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/pipelines/${pipeline.id}`)
        .send({ name: 'Anon Update' })

      expect(res.status).toBe(401)
    })
  })

  // ─── DELETE /pipelines/:id ────────────────────────────────────────────────────

  describe('DELETE /pipelines/:id', () => {
    let pipeline: { id: string }
    let pipelineForMember: { id: string }

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/pipelines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Pipeline To Delete' })
      pipeline = res.body

      const res2 = await request(app.getHttpServer())
        .post('/pipelines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Pipeline Member Cannot Delete' })
      pipelineForMember = res2.body
    })

    it('204 — ACCOUNT_ADMIN deletes pipeline', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/pipelines/${pipeline.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(204)
    })

    it('404 — pipeline not found', async () => {
      const res = await request(app.getHttpServer())
        .delete('/pipelines/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(404)
    })

    it('403 — MEMBER cannot delete', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/pipelines/${pipelineForMember.id}`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(res.status).toBe(403)
    })

    it('401 — unauthenticated rejected', async () => {
      const res = await request(app.getHttpServer()).delete(`/pipelines/${pipeline.id}`)
      expect(res.status).toBe(401)
    })
  })

  // ─── GET /pipelines/:id/stages ────────────────────────────────────────────────

  describe('GET /pipelines/:id/stages', () => {
    let pipeline: { id: string }

    beforeAll(async () => {
      const pRes = await request(app.getHttpServer())
        .post('/pipelines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Stages Pipeline' })
      pipeline = pRes.body

      // Create a couple of stages
      await request(app.getHttpServer())
        .post(`/pipelines/${pipeline.id}/stages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Stage B', order: 1 })

      await request(app.getHttpServer())
        .post(`/pipelines/${pipeline.id}/stages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Stage A', order: 0 })
    })

    it('200 — returns stages ordered by order', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pipelines/${pipeline.id}/stages`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(2)

      const orders = res.body.map((s: { order: number }) => s.order)
      expect(orders).toEqual([...orders].sort((a, b) => a - b))
    })

    it('401 — unauthenticated rejected', async () => {
      const res = await request(app.getHttpServer()).get(`/pipelines/${pipeline.id}/stages`)
      expect(res.status).toBe(401)
    })
  })

  // ─── POST /pipelines/:id/stages ───────────────────────────────────────────────

  describe('POST /pipelines/:id/stages', () => {
    let pipeline: { id: string }

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/pipelines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Stage Create Pipeline' })
      pipeline = res.body
    })

    it('201 — ACCOUNT_ADMIN creates stage', async () => {
      const res = await request(app.getHttpServer())
        .post(`/pipelines/${pipeline.id}/stages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Stage', order: 0 })

      expect(res.status).toBe(201)
      expect(res.body.id).toBeDefined()
      expect(res.body.name).toBe('New Stage')
    })

    it('403 — MEMBER cannot create stage', async () => {
      const res = await request(app.getHttpServer())
        .post(`/pipelines/${pipeline.id}/stages`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Forbidden Stage', order: 1 })

      expect(res.status).toBe(403)
    })

    it('401 — unauthenticated rejected', async () => {
      const res = await request(app.getHttpServer())
        .post(`/pipelines/${pipeline.id}/stages`)
        .send({ name: 'Anon Stage', order: 2 })

      expect(res.status).toBe(401)
    })
  })
})
