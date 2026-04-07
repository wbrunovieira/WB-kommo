import { Module } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaUserIdentityRepository } from '@/infra/database/prisma/repositories/prisma-user-identity.repository'
import { PrismaUserProfileRepository } from '@/infra/database/prisma/repositories/prisma-user-profile.repository'
import { PrismaUserAuthorizationRepository } from '@/infra/database/prisma/repositories/prisma-user-authorization.repository'
import { PrismaUserSessionRepository } from '@/infra/database/prisma/repositories/prisma-user-session.repository'
import { PrismaUserAggregatedViewRepository } from '@/infra/database/prisma/repositories/prisma-user-aggregated-view.repository'
import { PrismaTenantRepository } from '@/infra/database/prisma/repositories/prisma-tenant.repository'
import { IUserIdentityRepository } from '@/domain/auth/application/repositories/i-user-identity.repository'
import { IUserProfileRepository } from '@/domain/auth/application/repositories/i-user-profile.repository'
import { IUserAuthorizationRepository } from '@/domain/auth/application/repositories/i-user-authorization.repository'
import { IUserSessionRepository } from '@/domain/auth/application/repositories/i-user-session.repository'
import { IUserAggregatedViewRepository } from '@/domain/auth/application/repositories/i-user-aggregated-view.repository'
import { ITenantRepository } from '@/domain/tenants/application/repositories/i-tenant.repository'

@Module({
  providers: [
    PrismaService,
    { provide: IUserIdentityRepository,       useClass: PrismaUserIdentityRepository },
    { provide: IUserProfileRepository,        useClass: PrismaUserProfileRepository },
    { provide: IUserAuthorizationRepository,  useClass: PrismaUserAuthorizationRepository },
    { provide: IUserSessionRepository,        useClass: PrismaUserSessionRepository },
    { provide: IUserAggregatedViewRepository, useClass: PrismaUserAggregatedViewRepository },
    { provide: ITenantRepository,             useClass: PrismaTenantRepository },
  ],
  exports: [
    PrismaService,
    IUserIdentityRepository,
    IUserProfileRepository,
    IUserAuthorizationRepository,
    IUserSessionRepository,
    IUserAggregatedViewRepository,
    ITenantRepository,
  ],
})
export class DatabaseModule {}
