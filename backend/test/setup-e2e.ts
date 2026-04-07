import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'

const schemaId = randomUUID()
const baseUrl = process.env.DATABASE_URL ?? 'postgresql://wb_user:wb_pass@localhost:5432/wb_kommo_db'
const schemaUrl = `${baseUrl.split('?')[0]}?schema=${schemaId}`

beforeAll(async () => {
  process.env.DATABASE_URL = schemaUrl

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: schemaUrl },
    stdio: 'inherit',
  })
})

afterAll(async () => {
  const prisma = new PrismaClient({ datasources: { db: { url: schemaUrl } } })
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaId}" CASCADE`)
  await prisma.$disconnect()
})
