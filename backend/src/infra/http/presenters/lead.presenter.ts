import { Lead } from '@/domain/leads/enterprise/entities/lead.entity'

export interface LeadHttpResponse {
  id: string
  tenantId: string
  pipelineId: string
  stageId: string
  name: string
  value?: number
  status: string
  assignedToId?: string
  tags: string[]
  deletedAt?: Date
  deletedByUserId?: string
  createdAt?: Date
  updatedAt?: Date
}

export class LeadPresenter {
  static toHttp(lead: Lead): LeadHttpResponse {
    return {
      id: lead.id.toString(),
      tenantId: lead.tenantId,
      pipelineId: lead.pipelineId,
      stageId: lead.stageId,
      name: lead.name,
      value: lead.value,
      status: lead.status,
      assignedToId: lead.assignedToId,
      tags: lead.tags,
      deletedAt: lead.deletedAt,
      deletedByUserId: lead.deletedByUserId,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    }
  }

  static toHttpList(leads: Lead[]): LeadHttpResponse[] {
    return leads.map(LeadPresenter.toHttp)
  }
}
