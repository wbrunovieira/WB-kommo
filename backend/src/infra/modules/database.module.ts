import { Module } from '@nestjs/common'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaUserIdentityRepository } from '@/infra/database/prisma/repositories/prisma-user-identity.repository'
import { PrismaUserProfileRepository } from '@/infra/database/prisma/repositories/prisma-user-profile.repository'
import { PrismaUserAuthorizationRepository } from '@/infra/database/prisma/repositories/prisma-user-authorization.repository'
import { PrismaUserSessionRepository } from '@/infra/database/prisma/repositories/prisma-user-session.repository'
import { PrismaUserAggregatedViewRepository } from '@/infra/database/prisma/repositories/prisma-user-aggregated-view.repository'
import { PrismaTenantRepository } from '@/infra/database/prisma/repositories/prisma-tenant.repository'
import { PrismaLeadRepository } from '@/infra/database/prisma/repositories/prisma-lead.repository'
import { PrismaPipelineRepository } from '@/infra/database/prisma/repositories/prisma-pipeline.repository'
import { PrismaStageRepository } from '@/infra/database/prisma/repositories/prisma-stage.repository'
import { PrismaPlanRepository } from '@/infra/database/prisma/repositories/prisma-plan.repository'
import { IUserIdentityRepository } from '@/domain/auth/application/repositories/i-user-identity.repository'
import { IUserProfileRepository } from '@/domain/auth/application/repositories/i-user-profile.repository'
import { IUserAuthorizationRepository } from '@/domain/auth/application/repositories/i-user-authorization.repository'
import { IUserSessionRepository } from '@/domain/auth/application/repositories/i-user-session.repository'
import { IUserAggregatedViewRepository } from '@/domain/auth/application/repositories/i-user-aggregated-view.repository'
import { ITenantRepository } from '@/domain/tenants/application/repositories/i-tenant.repository'
import { ILeadRepository } from '@/domain/leads/application/repositories/i-lead.repository'
import { IPipelineRepository } from '@/domain/pipelines/application/repositories/i-pipeline.repository'
import { IStageRepository } from '@/domain/pipelines/application/repositories/i-stage.repository'
import { IPlanRepository } from '@/domain/plans/application/repositories/i-plan.repository'
import { ILeadFieldConfigRepository } from '@/domain/leads/application/repositories/i-lead-field-config.repository'
import { PrismaLeadFieldConfigRepository } from '@/infra/database/prisma/repositories/prisma-lead-field-config.repository'

@Module({
  providers: [
    PrismaService,
    { provide: IUserIdentityRepository,       useClass: PrismaUserIdentityRepository },
    { provide: IUserProfileRepository,        useClass: PrismaUserProfileRepository },
    { provide: IUserAuthorizationRepository,  useClass: PrismaUserAuthorizationRepository },
    { provide: IUserSessionRepository,        useClass: PrismaUserSessionRepository },
    { provide: IUserAggregatedViewRepository, useClass: PrismaUserAggregatedViewRepository },
    { provide: ITenantRepository,             useClass: PrismaTenantRepository },
    { provide: ILeadRepository,               useClass: PrismaLeadRepository },
    { provide: IPipelineRepository,           useClass: PrismaPipelineRepository },
    { provide: IStageRepository,              useClass: PrismaStageRepository },
    { provide: IPlanRepository,               useClass: PrismaPlanRepository },
    { provide: ILeadFieldConfigRepository,    useClass: PrismaLeadFieldConfigRepository },
  ],
  exports: [
    PrismaService,
    IUserIdentityRepository,
    IUserProfileRepository,
    IUserAuthorizationRepository,
    IUserSessionRepository,
    IUserAggregatedViewRepository,
    ITenantRepository,
    ILeadRepository,
    IPipelineRepository,
    IStageRepository,
    IPlanRepository,
    ILeadFieldConfigRepository,
  ],
})
export class DatabaseModule {}
