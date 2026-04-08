import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { RoleType } from '@prisma/client'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { Env } from '@/env/env'

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onModuleInit() {
    if (this.config.get('NODE_ENV') === 'test') return
    await this.seedReseller()
  }

  private async seedReseller() {
    const email = this.config.get('SEED_RESELLER_EMAIL', { infer: true })
    const password = this.config.get('SEED_RESELLER_PASSWORD', { infer: true })
    const name = this.config.get('SEED_RESELLER_NAME', { infer: true })

    if (!email || !password || !name) {
      this.logger.warn('Seed skipped: SEED_RESELLER_EMAIL/PASSWORD/NAME not set in .env')
      return
    }

    // ── Plan ────────────────────────────────────────────────────────────────
    const plan = await this.prisma.plan.upsert({
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

    // ── Tenant (platform-level: resellerTenantId = null) ─────────────────────
    const tenant = await this.prisma.tenant.upsert({
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

    // ── UserIdentity — idempotent ────────────────────────────────────────────
    const existing = await this.prisma.userIdentity.findFirst({
      where: { tenantId: tenant.id, email },
    })

    if (existing) {
      this.logger.log(`Seed: user already exists (${email}) — skipping`)
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const identity = await this.prisma.userIdentity.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        isEmailVerified: true,
      },
    })

    // ── UserProfile ──────────────────────────────────────────────────────────
    await this.prisma.userProfile.create({
      data: {
        tenantId: tenant.id,
        identityId: identity.id,
        name,
        timezone: 'America/Sao_Paulo',
        language: 'pt-BR',
      },
    })

    // ── UserAuthorization (PLATFORM_OWNER — has global access) ───────────────
    await this.prisma.userAuthorization.create({
      data: {
        tenantId: tenant.id,
        identityId: identity.id,
        role: RoleType.PLATFORM_OWNER,
        customPermissions: [],
        restrictions: [],
        effectiveFrom: new Date(),
      },
    })

    this.logger.log(`Seed: platform owner created — ${name} <${email}>`)
  }
}
