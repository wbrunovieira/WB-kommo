import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ITenantRepository, TenantSummary, TenantListItem } from '@/domain/tenants/application/repositories/i-tenant.repository'
import { Tenant } from '@/domain/tenants/enterprise/entities/tenant.entity'
import { PrismaService } from '../prisma.service'

const LIST_SELECT = { id: true, name: true, slug: true, isActive: true, resellerTenantId: true } as const

@Injectable()
export class PrismaTenantRepository implements ITenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySlug(slug: string): Promise<Either<Error, TenantSummary | null>> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, isActive: true, planId: true },
      })
      return right(tenant ?? null)
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)))
    }
  }

  async findById(id: string): Promise<Either<Error, TenantSummary | null>> {
    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id },
        select: { id: true, isActive: true, planId: true },
      })
      return right(tenant ?? null)
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)))
    }
  }

  async findClientsByReseller(resellerTenantId: string): Promise<Either<Error, TenantListItem[]>> {
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { resellerTenantId },
        select: LIST_SELECT,
        orderBy: { name: 'asc' },
      })
      return right(tenants)
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)))
    }
  }

  async findAllResellers(): Promise<Either<Error, TenantListItem[]>> {
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { resellerTenantId: null },
        select: LIST_SELECT,
        orderBy: { name: 'asc' },
      })
      return right(tenants)
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)))
    }
  }

  async findAll(): Promise<Either<Error, TenantListItem[]>> {
    try {
      const tenants = await this.prisma.tenant.findMany({
        select: LIST_SELECT,
        orderBy: { name: 'asc' },
      })
      return right(tenants)
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)))
    }
  }

  async save(tenant: Tenant): Promise<Either<Error, void>> {
    try {
      await this.prisma.tenant.create({
        data: {
          id: tenant.id.toString(),
          name: tenant.name,
          slug: tenant.slug,
          planId: tenant.planId,
          isActive: tenant.isActive,
          resellerTenantId: tenant.resellerTenantId,
        },
      })
      return right(undefined)
    } catch (err) {
      return left(err instanceof Error ? err : new Error(String(err)))
    }
  }
}
