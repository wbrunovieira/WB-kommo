import { Either } from '@/core/errors/either'
import { Lead, LeadStatus } from '../../enterprise/entities/lead.entity'

export interface LeadFilters {
  pipelineId?: string
  stageId?: string
  status?: LeadStatus
  assignedToId?: string
}

export abstract class ILeadRepository {
  abstract findById(id: string, tenantId: string): Promise<Either<Error, Lead | null>>
  abstract findByTenant(tenantId: string, filters?: LeadFilters): Promise<Either<Error, Lead[]>>
  abstract findByTenantAndOwner(tenantId: string, ownerId: string): Promise<Either<Error, Lead[]>>
  abstract countByTenant(tenantId: string): Promise<Either<Error, number>>
  abstract findDeleted(tenantId: string): Promise<Either<Error, Lead[]>>
  abstract save(lead: Lead): Promise<Either<Error, void>>
}
