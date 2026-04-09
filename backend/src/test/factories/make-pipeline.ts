import { Pipeline, PipelineProps } from '@/domain/pipelines/enterprise/entities/pipeline.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

type FactoryProps = Partial<Pick<PipelineProps, 'tenantId' | 'name'>>

export function makePipeline(
  overrides: FactoryProps = {},
  id?: UniqueEntityID,
): Pipeline {
  return Pipeline.create(
    {
      tenantId: overrides.tenantId ?? 'tenant-1',
      name: overrides.name ?? 'Sales Pipeline',
    },
    id,
  )
}
