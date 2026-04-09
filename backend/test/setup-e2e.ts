import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'

const schemaId = randomUUID()
const baseUrl = process.env.DATABASE_URL ?? 'postgresql://wb_user:wb_pass@localhost:5432/wb_kommo_db'
const schemaUrl = `${baseUrl.split('?')[0]}?schema=${schemaId}`

beforeAll(async () => {
  process.env.DATABASE_URL = schemaUrl

  execSync('npx prisma db push --force-reset', {
    env: {
      ...process.env,
      DATABASE_URL: schemaUrl,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes',
    },
    stdio: 'inherit',
  })

  // Seed the default reseller plan used by tenants controller
  const prisma = new PrismaClient({ datasources: { db: { url: schemaUrl } } })
  await prisma.plan.upsert({
    where: { id: 'plan-reseller' },
    update: {},
    create: { id: 'plan-reseller', name: 'Reseller', maxUsers: -1, maxLeads: -1, price: 0 },
  })
  await prisma.$disconnect()
})

afterAll(async () => {
  const prisma = new PrismaClient({ datasources: { db: { url: schemaUrl } } })
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`)
  await prisma.$disconnect()
})
