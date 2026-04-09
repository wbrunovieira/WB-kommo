import { Either, right } from '@/core/errors/either'
import { ILeadRepository, LeadFilters } from '@/domain/leads/application/repositories/i-lead.repository'
import { Lead } from '@/domain/leads/enterprise/entities/lead.entity'

export class InMemoryLeadRepository implements ILeadRepository {
  public items: Lead[] = []

  async findById(id: string, tenantId: string): Promise<Either<Error, Lead | null>> {
    const lead = this.items.find(
      (l) => l.id.toString() === id && l.tenantId === tenantId,
    )
    return right(lead ?? null)
  }

  async findByTenant(tenantId: string, filters?: LeadFilters): Promise<Either<Error, Lead[]>> {
    let leads = this.items.filter((l) => l.tenantId === tenantId && !l.isDeleted())

    if (filters?.pipelineId) {
      leads = leads.filter((l) => l.pipelineId === filters.pipelineId)
    }
    if (filters?.stageId) {
      leads = leads.filter((l) => l.stageId === filters.stageId)
    }
    if (filters?.status) {
      leads = leads.filter((l) => l.status === filters.status)
    }
    if (filters?.assignedToId) {
      leads = leads.filter((l) => l.assignedToId === filters.assignedToId)
    }

    return right(leads)
  }

  async findByTenantAndOwner(tenantId: string, ownerId: string): Promise<Either<Error, Lead[]>> {
    const leads = this.items.filter(
      (l) => l.tenantId === tenantId && l.assignedToId === ownerId && !l.isDeleted(),
    )
    return right(leads)
  }

  async countByTenant(tenantId: string): Promise<Either<Error, number>> {
    const count = this.items.filter((l) => l.tenantId === tenantId && !l.isDeleted()).length
    return right(count)
  }

  async findDeleted(tenantId: string): Promise<Either<Error, Lead[]>> {
    const leads = this.items.filter((l) => l.tenantId === tenantId && l.isDeleted())
    return right(leads)
  }

  async save(lead: Lead): Promise<Either<Error, void>> {
    const existingIndex = this.items.findIndex((l) => l.id.equals(lead.id))
    if (existingIndex >= 0) {
      this.items[existingIndex] = lead
    } else {
      this.items.push(lead)
    }
    return right(undefined)
  }
}
