import { Stage, StageProps } from '@/domain/pipelines/enterprise/entities/stage.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

type FactoryProps = Partial<Pick<StageProps, 'pipelineId' | 'name' | 'order' | 'color'>>

export function makeStage(
  overrides: FactoryProps = {},
  id?: UniqueEntityID,
): Stage {
  return Stage.create(
    {
      pipelineId: overrides.pipelineId ?? 'pipeline-1',
      name: overrides.name ?? 'New',
      order: overrides.order ?? 1,
      color: overrides.color,
    },
    id,
  )
}
