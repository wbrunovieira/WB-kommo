import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import {
  IUserAggregatedViewRepository,
  UserAggregatedView,
} from '@/domain/auth/application/repositories/i-user-aggregated-view.repository'
import { PrismaService } from '../prisma.service'
import { PrismaUserIdentityMapper } from '../mappers/prisma-user-identity.mapper'
import { PrismaUserProfileMapper } from '../mappers/prisma-user-profile.mapper'
import { PrismaUserAuthorizationMapper } from '../mappers/prisma-user-authorization.mapper'

@Injectable()
export class PrismaUserAggregatedViewRepository implements IUserAggregatedViewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(
    tenantId: string,
    email: string,
  ): Promise<Either<Error, UserAggregatedView | null>> {
    try {
      const raw = await this.prisma.userIdentity.findFirst({
        where: { tenantId, email, deletedAt: null },
        include: { profile: true, authorization: true },
      })

      if (!raw || !raw.profile || !raw.authorization) return right(null)

      return right({
        identity: PrismaUserIdentityMapper.toDomain(raw),
        profile: PrismaUserProfileMapper.toDomain(raw.profile),
        authorization: PrismaUserAuthorizationMapper.toDomain(raw.authorization),
      })
    } catch (err) {
      return left(new Error(`Failed to fetch aggregated user view: ${err}`))
    }
  }

  async findByTenant(tenantId: string): Promise<Either<Error, UserAggregatedView[]>> {
    try {
      const rows = await this.prisma.userIdentity.findMany({
        where: { tenantId, deletedAt: null },
        include: { profile: true, authorization: true },
      })

      const views: UserAggregatedView[] = rows
        .filter((r) => r.profile && r.authorization)
        .map((r) => ({
          identity: PrismaUserIdentityMapper.toDomain(r),
          profile: PrismaUserProfileMapper.toDomain(r.profile!),
          authorization: PrismaUserAuthorizationMapper.toDomain(r.authorization!),
        }))

      return right(views)
    } catch (err) {
      return left(new Error(`Failed to fetch tenant users: ${err}`))
    }
  }
}
