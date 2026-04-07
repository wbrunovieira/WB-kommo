import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ITenantRepository, TenantSummary } from '@/domain/tenants/application/repositories/i-tenant.repository'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaTenantRepository implements ITenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string): Promise<Either<Error, TenantSummary | null>> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, isActive: true },
      })
      return right(tenant ?? null)
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
