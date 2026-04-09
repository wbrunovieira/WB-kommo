import { Lead as PrismaLead } from '@prisma/client'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { Lead } from '@/domain/leads/enterprise/entities/lead.entity'

export class PrismaLeadMapper {
  static toDomain(raw: PrismaLead): Lead {
    return Lead.reconstitute(
      {
        tenantId: raw.tenantId,
        pipelineId: raw.pipelineId,
        stageId: raw.stageId,
        name: raw.name,
        value: raw.value ? Number(raw.value) : undefined,
        status: raw.status as 'OPEN' | 'WON' | 'LOST',
        assignedToId: raw.assignedToId ?? undefined,
        tags: raw.tags,
        customFields: raw.customFields as Record<string, unknown> | undefined,
        deletedAt: raw.deletedAt ?? undefined,
        deletedByUserId: raw.deletedByUserId ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPersistence(lead: Lead) {
    return {
      id: lead.id.toString(),
      tenantId: lead.tenantId,
      pipelineId: lead.pipelineId,
      stageId: lead.stageId,
      name: lead.name,
      value: lead.value ?? null,
      status: lead.status,
      assignedToId: lead.assignedToId ?? null,
      tags: lead.tags,
      customFields: lead.customFields ?? null,
      deletedAt: lead.deletedAt ?? null,
      deletedByUserId: lead.deletedByUserId ?? null,
    }
  }
}
