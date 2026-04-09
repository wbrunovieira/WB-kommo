import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ITenantRepository } from '../../repositories/i-tenant.repository'
import { Tenant } from '../../../enterprise/entities/tenant.entity'
import { TenantSlugTakenError } from '../errors/tenant-slug-taken.error'

export interface CreateTenantRequest {
  name: string
  slug: string
  planId: string
  resellerTenantId: string | null
}

export interface CreateTenantResponse {
  id: string
  name: string
  slug: string
  resellerTenantId: string | null
}

export type CreateTenantResult = Either<TenantSlugTakenError | Error, CreateTenantResponse>

@Injectable()
export class CreateTenantUseCase {
  constructor(private readonly tenantRepo: ITenantRepository) {}

  async execute(request: CreateTenantRequest): Promise<CreateTenantResult> {
    const existing = await this.tenantRepo.findBySlug(request.slug)
    if (existing.isLeft()) return left(existing.value as TenantSlugTakenError)
    if (existing.value !== null) return left(new TenantSlugTakenError(request.slug))

    const tenant = Tenant.create({
      name: request.name,
      slug: request.slug,
      planId: request.planId,
      resellerTenantId: request.resellerTenantId,
    })

    const saveResult = await this.tenantRepo.save(tenant)
    if (saveResult.isLeft()) return left(saveResult.value)

    return right({
      id: tenant.id.toString(),
      name: tenant.name,
      slug: tenant.slug,
      resellerTenantId: tenant.resellerTenantId,
    })
  }
}
