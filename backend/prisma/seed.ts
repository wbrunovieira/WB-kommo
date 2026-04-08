import { PrismaClient, RoleType } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_RESELLER_EMAIL
  const password = process.env.SEED_RESELLER_PASSWORD
  const name = process.env.SEED_RESELLER_NAME

  if (!email || !password || !name) {
    throw new Error(
      'Missing seed env vars: SEED_RESELLER_EMAIL, SEED_RESELLER_PASSWORD, SEED_RESELLER_NAME',
    )
  }

  // ── 1. Plan ─────────────────────────────────────────────────────────────────
  const plan = await prisma.plan.upsert({
    where: { id: 'plan-reseller' },
    update: {},
    create: {
      id: 'plan-reseller',
      name: 'Reseller',
      maxUsers: -1,
      maxLeads: -1,
      price: 0,
      features: {},
    },
  })

  // ── 2. Tenant (platform-level: resellerTenantId = null) ────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'wb-digital-solutions' },
    update: {},
    create: {
      id: 'tenant-reseller',
      name: 'WB Digital Solutions',
      slug: 'wb-digital-solutions',
      planId: plan.id,
      isActive: true,
      resellerTenantId: null,
    },
  })

  // ── 3. UserIdentity ─────────────────────────────────────────────────────────
  const existing = await prisma.userIdentity.findFirst({
    where: { tenantId: tenant.id, email },
  })

  if (existing) {
    console.log(`ℹ  User already exists: ${email} — skipping.`)
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const identity = await prisma.userIdentity.create({
    data: {
      tenantId: tenant.id,
      email,
      passwordHash,
      isEmailVerified: true,
    },
  })

  // ── 4. UserProfile ──────────────────────────────────────────────────────────
  await prisma.userProfile.create({
    data: {
      tenantId: tenant.id,
      identityId: identity.id,
      name,
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
    },
  })

  // ── 5. UserAuthorization (PLATFORM_OWNER) ──────────────────────────────────
  await prisma.userAuthorization.create({
    data: {
      tenantId: tenant.id,
      identityId: identity.id,
      role: RoleType.PLATFORM_OWNER,
      customPermissions: [],
      restrictions: [],
      effectiveFrom: new Date(),
    },
  })

  console.log(`✓  Platform owner created: ${name} <${email}>`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
