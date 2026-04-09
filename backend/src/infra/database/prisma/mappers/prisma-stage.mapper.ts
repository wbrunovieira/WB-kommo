import { Stage as PrismaStage } from '@prisma/client'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { Stage } from '@/domain/pipelines/enterprise/entities/stage.entity'

export class PrismaStageMapper {
  static toDomain(raw: PrismaStage): Stage {
    return Stage.reconstitute(
      {
        pipelineId: raw.pipelineId,
        name: raw.name,
        order: raw.order,
        color: raw.color ?? undefined,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPersistence(stage: Stage) {
    return {
      id: stage.id.toString(),
      pipelineId: stage.pipelineId,
      name: stage.name,
      order: stage.order,
      color: stage.color ?? null,
    }
  }
}
