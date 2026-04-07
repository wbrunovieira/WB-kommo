import { Either } from '@/core/errors/either'

export interface TenantSummary {
  id: string
  isActive: boolean
}

export abstract class ITenantRepository {
  abstract findBySlug(slug: string): Promise<Either<Error, TenantSummary | null>>
}
