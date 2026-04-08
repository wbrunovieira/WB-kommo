import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '@/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import cookieParser from 'cookie-parser'

// ─── Setup ───────────────────────────────────────────────────────────────────

async function seedPlan(prisma: PrismaService) {
  await prisma.plan.upsert({
    where: { id: 'e2e-plan-tenants' },
    update: {},
    create: { id: 'e2e-plan-tenants', name: 'Starter', maxUsers: 10, maxLeads: 100, price: 0 },
  })
}

async function seedTenant(prisma: PrismaService, id: string, slug: string, resellerTenantId: string | null = null) {
  return prisma.tenant.upsert({
    where: { id },
    update: {},
    create: { id, name: slug, slug, planId: 'e2e-plan-tenants', resellerTenantId },
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

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Tenants routes (E2E)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const RESELLER_TENANT  = 'e2e-reseller-tenants'
  const CLIENT_TENANT_1  = 'e2e-client-1'
  const CLIENT_TENANT_2  = 'e2e-client-2'
  const OTHER_RESELLER   = 'e2e-other-reseller'
  const PLATFORM_TENANT  = 'e2e-platform'

  let resellerToken:      string
  let platformOwnerToken: string
  let memberToken:        string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.use(cookieParser())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    await app.init()

    prisma = module.get(PrismaService)
    await seedPlan(prisma)

    // Reseller tenant and its 2 clients
    await seedTenant(prisma, RESELLER_TENANT,  RESELLER_TENANT,  null)
    await seedTenant(prisma, CLIENT_TENANT_1,  CLIENT_TENANT_1,  RESELLER_TENANT)
    await seedTenant(prisma, CLIENT_TENANT_2,  CLIENT_TENANT_2,  RESELLER_TENANT)
    await seedTenant(prisma, OTHER_RESELLER,   OTHER_RESELLER,   null)

    // Platform-owner tenant (top-level)
    await seedTenant(prisma, PLATFORM_TENANT,  PLATFORM_TENANT,  null)

    resellerToken      = await registerAndLogin(app, RESELLER_TENANT, 'reseller@tenants-e2e.com', 'RESELLER')
    platformOwnerToken = await registerAndLogin(app, PLATFORM_TENANT, 'owner@tenants-e2e.com',    'PLATFORM_OWNER')
    memberToken        = await registerAndLogin(app, RESELLER_TENANT, 'member@tenants-e2e.com',   'MEMBER')
  })

  afterAll(async () => { await app.close() })

  // ─── GET /tenants ─────────────────────────────────────────────────────────

  describe('GET /tenants', () => {
    it('200 — RESELLER sees only their client tenants', async () => {
      const res = await request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${resellerToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)

      const ids = res.body.map((t: { id: string }) => t.id)
      expect(ids).toContain(CLIENT_TENANT_1)
      expect(ids).toContain(CLIENT_TENANT_2)
      expect(ids).not.toContain(OTHER_RESELLER)
      expect(ids).not.toContain(PLATFORM_TENANT)
    })

    it('200 — PLATFORM_OWNER sees all tenants', async () => {
      const res = await request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${platformOwnerToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)

      const ids = res.body.map((t: { id: string }) => t.id)
      expect(ids).toContain(CLIENT_TENANT_1)
      expect(ids).toContain(CLIENT_TENANT_2)
      expect(ids).toContain(RESELLER_TENANT)
      expect(ids).toContain(OTHER_RESELLER)
      expect(ids).toContain(PLATFORM_TENANT)
    })

    it('403 — MEMBER cannot list tenants', async () => {
      const res = await request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${memberToken}`)

      expect(res.status).toBe(403)
    })

    it('401 — unauthenticated request is rejected', async () => {
      const res = await request(app.getHttpServer()).get('/tenants')
      expect(res.status).toBe(401)
    })
  })

  // ─── POST /tenants ────────────────────────────────────────────────────────

  describe('POST /tenants', () => {
    it('201 — RESELLER creates a client tenant linked to themselves', async () => {
      const res = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${resellerToken}`)
        .send({ name: 'New Client Corp', slug: 'new-client-corp' })

      expect(res.status).toBe(201)
      expect(res.body.slug).toBe('new-client-corp')
      expect(res.body.resellerTenantId).toBe(RESELLER_TENANT)

      // Verify it appears in their list
      const listRes = await request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${resellerToken}`)
      const ids = listRes.body.map((t: { id: string }) => t.id)
      expect(ids).toContain(res.body.id)
    })

    it('201 — PLATFORM_OWNER creates a reseller tenant (resellerTenantId = null)', async () => {
      const res = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${platformOwnerToken}`)
        .send({ name: 'New Reseller Agency', slug: 'new-reseller-agency' })

      expect(res.status).toBe(201)
      expect(res.body.slug).toBe('new-reseller-agency')
      expect(res.body.resellerTenantId).toBeNull()
    })

    it('409 — returns conflict when slug is already taken', async () => {
      await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${resellerToken}`)
        .send({ name: 'Dup Corp', slug: 'dup-slug-e2e' })

      const res = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${resellerToken}`)
        .send({ name: 'Dup Corp Again', slug: 'dup-slug-e2e' })

      expect(res.status).toBe(409)
      expect(res.body.title).toBe('Slug already taken')
    })

    it('400 — rejects invalid slug format', async () => {
      const res = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${resellerToken}`)
        .send({ name: 'Bad Slug', slug: 'INVALID SLUG!' })

      expect(res.status).toBe(400)
    })

    it('400 — rejects missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${resellerToken}`)
        .send({ name: 'Missing Slug' })

      expect(res.status).toBe(400)
    })

    it('403 — MEMBER cannot create tenants', async () => {
      const res = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'Forbidden Corp', slug: 'forbidden-corp' })

      expect(res.status).toBe(403)
    })

    it('401 — unauthenticated request is rejected', async () => {
      const res = await request(app.getHttpServer())
        .post('/tenants')
        .send({ name: 'Anon Corp', slug: 'anon-corp' })

      expect(res.status).toBe(401)
    })
  })
})
