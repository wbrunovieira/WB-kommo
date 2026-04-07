import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql'

// If DATABASE_URL is already set (Docker/CI), use it with an isolated schema.
// Otherwise spin up a Testcontainers PostgreSQL instance.
const PRESET_DATABASE_URL = process.env.DATABASE_URL
let container: StartedPostgreSqlContainer | undefined
let isolatedSchemaId: string | undefined

beforeAll(async () => {
  let url: string

  if (PRESET_DATABASE_URL) {
    // Docker/CI path: create an isolated schema on the existing postgres service
    isolatedSchemaId = `int_${randomUUID().replace(/-/g, '')}`
    const base = PRESET_DATABASE_URL.split('?')[0]
    url = `${base}?schema=${isolatedSchemaId}`
  } else {
    // Local path: spin up a fresh container
    const { PostgreSqlContainer } = await import('@testcontainers/postgresql')
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('wb_kommo_test')
      .withUsername('wb_user')
      .withPassword('wb_pass')
      .start()
    url = container.getConnectionUri()
  }

  process.env.DATABASE_URL = url

  execSync('npx prisma db push --force-reset', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  })
}, 120_000)

afterAll(async () => {
  if (container) {
    await container.stop()
  } else if (isolatedSchemaId) {
    const prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    })
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${isolatedSchemaId}" CASCADE`)
    await prisma.$disconnect()
  }
}, 30_000)
