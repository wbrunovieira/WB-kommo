import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '@/app.module'
import { PrismaService } from '@/infra/database/prisma/prisma.service'

// DATABASE_URL is set by setup-e2e.ts to an isolated schema
// migrations are applied before this suite runs

async function seedPlanAndTenant(prisma: PrismaService, tenantId: string) {
  await prisma.plan.upsert({
    where: { id: 'e2e-plan-1' },
    update: {},
    create: { id: 'e2e-plan-1', name: 'Starter', maxUsers: 10, maxLeads: 100, price: 0 },
  })
  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: { id: tenantId, name: 'E2E Tenant', slug: tenantId, planId: 'e2e-plan-1' },
  })
}

describe('Auth routes (E2E)', () => {
  let app: INestApplication
  let prisma: PrismaService

  const TENANT_ID = 'e2e-tenant-auth'

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()

    prisma = module.get(PrismaService)
    await seedPlanAndTenant(prisma, TENANT_ID)
  })

  afterAll(async () => {
    await app.close()
  })

  // ─── POST /auth/register ──────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('201 — registers a new user', async () => {
      const res = await request(app.getHttpServer()).post('/auth/register').send({
        tenantId: TENANT_ID,
        name: 'Alice',
        email: 'alice@e2e.com',
        password: 'Secret@123',
        role: 'ACCOUNT_ADMIN',
      })

      expect(res.status).toBe(201)
      expect(res.body.email).toBe('alice@e2e.com')
      expect(res.body.role).toBe('ACCOUNT_ADMIN')
      expect(res.body.userId).toBeDefined()
    })

    it('409 — rejects duplicate email in same tenant', async () => {
      const body = {
        tenantId: TENANT_ID,
        name: 'Dup',
        email: 'dup@e2e.com',
        password: 'Secret@123',
        role: 'MEMBER',
      }
      await request(app.getHttpServer()).post('/auth/register').send(body)
      const res = await request(app.getHttpServer()).post('/auth/register').send(body)

      expect(res.status).toBe(409)
      expect(res.body.title).toBe('Email already registered in this tenant')
    })

    it('400 — rejects invalid body', async () => {
      const res = await request(app.getHttpServer()).post('/auth/register').send({
        tenantId: TENANT_ID,
        email: 'not-an-email',
        password: '123',
      })
      expect(res.status).toBe(400)
    })
  })

  // ─── POST /auth/login ─────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    const USER_EMAIL = 'logintest@e2e.com'
    const USER_PASSWORD = 'Secret@123'

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        tenantId: TENANT_ID,
        name: 'Login User',
        email: USER_EMAIL,
        password: USER_PASSWORD,
        role: 'ACCOUNT_ADMIN',
      })
    })

    it('200 — returns access + refresh tokens', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({
        tenantId: TENANT_ID,
        email: USER_EMAIL,
        password: USER_PASSWORD,
      })

      expect(res.status).toBe(200)
      expect(res.body.accessToken).toBeDefined()
      expect(res.body.refreshToken).toBeDefined()
      expect(res.body.tokenType).toBe('Bearer')
    })

    it('401 — rejects wrong password', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({
        tenantId: TENANT_ID,
        email: USER_EMAIL,
        password: 'WrongPass!9',
      })
      expect(res.status).toBe(401)
      expect(res.body.title).toBe('Invalid credentials')
    })

    it('401 — rejects non-existent user', async () => {
      const res = await request(app.getHttpServer()).post('/auth/login').send({
        tenantId: TENANT_ID,
        email: 'ghost@e2e.com',
        password: 'Secret@123',
      })
      expect(res.status).toBe(401)
    })

    it('423 — locks account after 5 failed attempts', async () => {
      const lockedEmail = 'lockme@e2e.com'
      await request(app.getHttpServer()).post('/auth/register').send({
        tenantId: TENANT_ID,
        name: 'Lock Me',
        email: lockedEmail,
        password: 'Secret@123',
        role: 'MEMBER',
      })

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).post('/auth/login').send({
          tenantId: TENANT_ID,
          email: lockedEmail,
          password: 'WrongPass!9',
        })
      }

      const res = await request(app.getHttpServer()).post('/auth/login').send({
        tenantId: TENANT_ID,
        email: lockedEmail,
        password: 'Secret@123',
      })
      expect(res.status).toBe(423)
    })
  })

  // ─── POST /auth/refresh ───────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('200 — rotates refresh token', async () => {
      // Register + login to get a refresh token
      await request(app.getHttpServer()).post('/auth/register').send({
        tenantId: TENANT_ID,
        name: 'Refresh User',
        email: 'refresh@e2e.com',
        password: 'Secret@123',
        role: 'MEMBER',
      })
      const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
        tenantId: TENANT_ID,
        email: 'refresh@e2e.com',
        password: 'Secret@123',
      })
      const { refreshToken } = loginRes.body

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })

      expect(res.status).toBe(200)
      expect(res.body.refreshToken).toBeDefined()
      expect(res.body.refreshToken).not.toBe(refreshToken) // token rotated
      expect(res.body.accessToken).toBeDefined()
    })

    it('401 — rejects invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token-value' })

      expect(res.status).toBe(401)
    })

    it('401 — rejects reused refresh token (rotation)', async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        tenantId: TENANT_ID,
        name: 'Replay User',
        email: 'replay@e2e.com',
        password: 'Secret@123',
        role: 'MEMBER',
      })
      const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
        tenantId: TENANT_ID,
        email: 'replay@e2e.com',
        password: 'Secret@123',
      })
      const { refreshToken } = loginRes.body

      // Use token once
      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken })

      // Replay the same old token
      const replayRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })

      expect(replayRes.status).toBe(401)
    })
  })

  // ─── POST /auth/logout ────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('204 — revokes session and requires valid JWT', async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        tenantId: TENANT_ID,
        name: 'Logout User',
        email: 'logout@e2e.com',
        password: 'Secret@123',
        role: 'MEMBER',
      })
      const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
        tenantId: TENANT_ID,
        email: 'logout@e2e.com',
        password: 'Secret@123',
      })
      const { accessToken, refreshToken } = loginRes.body

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(204)

      // refresh token should now be invalid
      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })

      expect(refreshRes.status).toBe(401)
    })

    it('401 — rejects unauthenticated logout', async () => {
      const res = await request(app.getHttpServer()).post('/auth/logout')
      expect(res.status).toBe(401)
    })
  })

  // ─── POST /auth/impersonate/:tenantId ─────────────────────────────────────

  describe('POST /auth/impersonate/:tenantId', () => {
    let resellerToken: string
    let memberToken: string
    const TARGET_TENANT_ID = 'e2e-target-tenant'

    beforeAll(async () => {
      // Seed target tenant
      await prisma.tenant.upsert({
        where: { id: TARGET_TENANT_ID },
        update: {},
        create: { id: TARGET_TENANT_ID, name: 'Target Tenant', slug: TARGET_TENANT_ID, planId: 'e2e-plan-1' },
      })

      // Register RESELLER
      await request(app.getHttpServer()).post('/auth/register').send({
        tenantId: TENANT_ID,
        name: 'Reseller',
        email: 'reseller@e2e.com',
        password: 'Secret@123',
        role: 'RESELLER',
      })
      const resellerLogin = await request(app.getHttpServer()).post('/auth/login').send({
        tenantId: TENANT_ID,
        email: 'reseller@e2e.com',
        password: 'Secret@123',
      })
      resellerToken = resellerLogin.body.accessToken

      // Register MEMBER
      await request(app.getHttpServer()).post('/auth/register').send({
        tenantId: TENANT_ID,
        name: 'Member',
        email: 'member@e2e.com',
        password: 'Secret@123',
        role: 'MEMBER',
      })
      const memberLogin = await request(app.getHttpServer()).post('/auth/login').send({
        tenantId: TENANT_ID,
        email: 'member@e2e.com',
        password: 'Secret@123',
      })
      memberToken = memberLogin.body.accessToken
    })

    it('200 — RESELLER can impersonate', async () => {
      const res = await request(app.getHttpServer())
        .post(`/auth/impersonate/${TARGET_TENANT_ID}`)
        .set('Authorization', `Bearer ${resellerToken}`)

      expect(res.status).toBe(200)
      expect(res.body.accessToken).toBeDefined()
      expect(res.body.refreshToken).toBeDefined()
    })

    it('403 — MEMBER cannot impersonate', async () => {
      const res = await request(app.getHttpServer())
        .post(`/auth/impersonate/${TARGET_TENANT_ID}`)
        .set('Authorization', `Bearer ${memberToken}`)

      expect(res.status).toBe(403)
    })

    it('401 — unauthenticated request is rejected', async () => {
      const res = await request(app.getHttpServer())
        .post(`/auth/impersonate/${TARGET_TENANT_ID}`)

      expect(res.status).toBe(401)
    })
  })
})
