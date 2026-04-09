import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import { AppModule } from '@/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

// ─── Setup helpers ────────────────────────────────────────────────────────────

async function seedPlan(prisma: PrismaService) {
  await prisma.plan.upsert({
    where: { id: 'e2e-plan-leads' },
    update: {},
    create: { id: 'e2e-plan-leads', name: 'Starter', maxUsers: 10, maxLeads: 100, price: 0 },
  })
}

async function seedTenant(prisma: PrismaService, tenantId: string) {
  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: { id: tenantId, name: tenantId, slug: tenantId, planId: 'e2e-plan-leads' },
  })
}

async function seedPipeline(prisma: PrismaService, tenantId: string) {
  return prisma.pipeline.upsert({
    where: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
    update: {},
    create: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', tenantId, name: 'Main Pipeline', isActive: true },
  })
}

async function seedStage(prisma: PrismaService, pipelineId: string) {
  return prisma.stage.upsert({
    where: { id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' },
    update: {},
    create: { id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', pipelineId, name: 'New', order: 0 },
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

describe('Leads routes (E2E)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const TENANT_ID  = 'e2e-tenant-leads'
  const PIPELINE_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  const STAGE_ID    = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'

  let adminToken:  string
  let memberToken: string

  // IDs populated during tests
  let adminUserId:  string
  let memberUserId: string

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
    await seedPipeline(prisma, TENANT_ID)
    await seedStage(prisma, PIPELINE_ID)

    adminToken  = await registerAndLogin(app, TENANT_ID, 'admin-leads@e2e.com',  'ACCOUNT_ADMIN')
    memberToken = await registerAndLogin(app, TENANT_ID, 'member-leads@e2e.com', 'MEMBER')

    // Resolve user IDs from the DB for seeded identities
    const adminIdentity = await prisma.userIdentity.findUnique({
      where: { tenantId_email: { tenantId: TENANT_ID, email: 'admin-leads@e2e.com' } },
    })
    const memberIdentity = await prisma.userIdentity.findUnique({
      where: { tenantId_email: { tenantId: TENANT_ID, email: 'member-leads@e2e.com' } },
    })
    adminUserId  = adminIdentity!.id
    memberUserId = memberIdentity!.id
  })

  afterAll(async () => {
    await app.close()
  })

  // ─── POST /leads ──────────────────────────────────────────────────────────────

  describe('POST /leads', () => {
    it('201 — ACCOUNT_ADMIN creates a lead', async () => {
      const res = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Lead',
          pipelineId: PIPELINE_ID,
          stageId: STAGE_ID,
        })

      expect(res.status).toBe(201)
      expect(res.body.id).toBeDefined()
      expect(res.body.name).toBe('Admin Lead')
    })

    it('201 — MEMBER creates a lead (assigned to themselves)', async () => {
      const res = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Member Lead',
          pipelineId: PIPELINE_ID,
          stageId: STAGE_ID,
          assignedToId: memberUserId,
        })

      expect(res.status).toBe(201)
      expect(res.body.id).toBeDefined()
      expect(res.body.name).toBe('Member Lead')
    })

    it('400 — rejects missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Missing pipeline and stage' })

      expect(res.status).toBe(400)
    })

    it('401 — unauthenticated request rejected', async () => {
      const res = await request(app.getHttpServer())
        .post('/leads')
        .send({ name: 'Anon', pipelineId: PIPELINE_ID, stageId: STAGE_ID })

      expect(res.status).toBe(401)
    })
  })

  // ─── GET /leads ───────────────────────────────────────────────────────────────

  describe('GET /leads', () => {
    let adminLead: { id: string }
    let memberLead: { id: string }

    beforeAll(async () => {
      const aRes = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin List Lead', pipelineId: PIPELINE_ID, stageId: STAGE_ID })
      adminLead = aRes.body

      const mRes = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Member List Lead',
          pipelineId: PIPELINE_ID,
          stageId: STAGE_ID,
          assignedToId: memberUserId,
        })
      memberLead = mRes.body
    })

    it('200 — ACCOUNT_ADMIN sees all leads in tenant', async () => {
      const res = await request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      const ids = res.body.map((l: { id: string }) => l.id)
      expect(ids).toContain(adminLead.id)
      expect(ids).toContain(memberLead.id)
    })

    it('200 — MEMBER sees only own leads by default', async () => {
      const res = await request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer ${memberToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      // Member's own leads should be present; admin lead should not
      const ids = res.body.map((l: { id: string }) => l.id)
      expect(ids).toContain(memberLead.id)
      expect(ids).not.toContain(adminLead.id)
    })

    it('401 — unauthenticated rejected', async () => {
      const res = await request(app.getHttpServer()).get('/leads')
      expect(res.status).toBe(401)
    })
  })

  // ─── GET /leads/:id ───────────────────────────────────────────────────────────

  describe('GET /leads/:id', () => {
    let adminOwnedLead: { id: string }
    let memberOwnedLead: { id: string }

    beforeAll(async () => {
      // Admin creates a lead NOT assigned to the member
      const aRes = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Only Lead',
          pipelineId: PIPELINE_ID,
          stageId: STAGE_ID,
          assignedToId: adminUserId,
        })
      adminOwnedLead = aRes.body

      // Member creates (and is assigned to) their own lead
      const mRes = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Member Own Lead',
          pipelineId: PIPELINE_ID,
          stageId: STAGE_ID,
          assignedToId: memberUserId,
        })
      memberOwnedLead = mRes.body
    })

    it('200 — ACCOUNT_ADMIN gets any lead', async () => {
      const res = await request(app.getHttpServer())
        .get(`/leads/${adminOwnedLead.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.id).toBe(adminOwnedLead.id)
    })

    it('200 — MEMBER gets own lead', async () => {
      const res = await request(app.getHttpServer())
        .get(`/leads/${memberOwnedLead.id}`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(res.status).toBe(200)
      expect(res.body.id).toBe(memberOwnedLead.id)
    })

    it('403 — MEMBER cannot get another user lead', async () => {
      const res = await request(app.getHttpServer())
        .get(`/leads/${adminOwnedLead.id}`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(res.status).toBe(403)
    })

    it('404 — lead not found', async () => {
      const res = await request(app.getHttpServer())
        .get('/leads/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(404)
    })

    it('401 — unauthenticated rejected', async () => {
      const res = await request(app.getHttpServer()).get(`/leads/${adminOwnedLead.id}`)
      expect(res.status).toBe(401)
    })
  })

  // ─── PATCH /leads/:id ─────────────────────────────────────────────────────────

  describe('PATCH /leads/:id', () => {
    let adminOwnedLead: { id: string }
    let memberOwnedLead: { id: string }

    beforeAll(async () => {
      const aRes = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Patch Lead',
          pipelineId: PIPELINE_ID,
          stageId: STAGE_ID,
          assignedToId: adminUserId,
        })
      adminOwnedLead = aRes.body

      const mRes = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Member Patch Lead',
          pipelineId: PIPELINE_ID,
          stageId: STAGE_ID,
          assignedToId: memberUserId,
        })
      memberOwnedLead = mRes.body
    })

    it('200 — ACCOUNT_ADMIN updates any lead', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/leads/${adminOwnedLead.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Updated Lead' })

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Admin Updated Lead')
    })

    it('200 — MEMBER updates own lead', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/leads/${memberOwnedLead.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Member Updated Lead' })

      expect(res.status).toBe(200)
      expect(res.body.name).toBe('Member Updated Lead')
    })

    it('403 — MEMBER cannot update another user lead', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/leads/${adminOwnedLead.id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Forbidden Update' })

      expect(res.status).toBe(403)
    })

    it('401 — unauthenticated rejected', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/leads/${adminOwnedLead.id}`)
        .send({ name: 'Anon Update' })

      expect(res.status).toBe(401)
    })
  })

  // ─── DELETE /leads/:id (soft-delete) ──────────────────────────────────────────

  describe('DELETE /leads/:id (soft-delete)', () => {
    let leadToDelete: { id: string }
    let memberOwnedLead: { id: string }

    beforeAll(async () => {
      const dRes = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Lead To Delete', pipelineId: PIPELINE_ID, stageId: STAGE_ID })
      leadToDelete = dRes.body

      const mRes = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Member Cannot Delete',
          pipelineId: PIPELINE_ID,
          stageId: STAGE_ID,
          assignedToId: memberUserId,
        })
      memberOwnedLead = mRes.body
    })

    it('204 — ACCOUNT_ADMIN soft-deletes a lead', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/leads/${leadToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(204)
    })

    it('403 — MEMBER cannot soft-delete', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/leads/${memberOwnedLead.id}`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(res.status).toBe(403)
    })

    it('401 — unauthenticated rejected', async () => {
      const res = await request(app.getHttpServer()).delete(`/leads/${leadToDelete.id}`)
      expect(res.status).toBe(401)
    })
  })

  // ─── POST /leads/:id/restore ──────────────────────────────────────────────────

  describe('POST /leads/:id/restore', () => {
    let deletedLead: { id: string }
    let memberOwnedLead: { id: string }

    beforeAll(async () => {
      // Admin creates and then soft-deletes a lead for restore test
      const cRes = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Lead To Restore', pipelineId: PIPELINE_ID, stageId: STAGE_ID })
      deletedLead = cRes.body

      await request(app.getHttpServer())
        .delete(`/leads/${deletedLead.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      // A lead assigned to member for 403 test
      const mRes = await request(app.getHttpServer())
        .post('/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Member Restore Forbidden',
          pipelineId: PIPELINE_ID,
          stageId: STAGE_ID,
          assignedToId: memberUserId,
        })
      memberOwnedLead = mRes.body
      // Soft-delete it so restore can be attempted
      await request(app.getHttpServer())
        .delete(`/leads/${memberOwnedLead.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
    })

    it('200 — ACCOUNT_ADMIN restores a soft-deleted lead', async () => {
      const res = await request(app.getHttpServer())
        .post(`/leads/${deletedLead.id}/restore`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
    })

    it('403 — MEMBER cannot restore', async () => {
      const res = await request(app.getHttpServer())
        .post(`/leads/${memberOwnedLead.id}/restore`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(res.status).toBe(403)
    })

    it('401 — unauthenticated rejected', async () => {
      const res = await request(app.getHttpServer()).post(`/leads/${deletedLead.id}/restore`)
      expect(res.status).toBe(401)
    })
  })
})
