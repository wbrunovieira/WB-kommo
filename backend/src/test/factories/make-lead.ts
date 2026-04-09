import { Lead, LeadProps } from '@/domain/leads/enterprise/entities/lead.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

type FactoryProps = Partial<Omit<LeadProps, 'status' | 'tags'>> & { tags?: string[] }

export function makeLead(
  overrides: FactoryProps = {},
  id?: UniqueEntityID,
): Lead {
  return Lead.create(
    {
      tenantId: overrides.tenantId ?? 'tenant-1',
      pipelineId: overrides.pipelineId ?? 'pipeline-1',
      stageId: overrides.stageId ?? 'stage-1',
      name: overrides.name ?? 'Test Lead',
      value: overrides.value,
      assignedToId: overrides.assignedToId,
      tags: overrides.tags ?? [],
      customFields: overrides.customFields,
    },
    id,
  )
}
