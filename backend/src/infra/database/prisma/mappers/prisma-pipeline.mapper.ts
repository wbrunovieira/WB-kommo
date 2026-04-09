import { Pipeline as PrismaPipeline } from '@prisma/client'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { Pipeline } from '@/domain/pipelines/enterprise/entities/pipeline.entity'

export class PrismaPipelineMapper {
  static toDomain(raw: PrismaPipeline): Pipeline {
    return Pipeline.reconstitute(
      {
        tenantId: raw.tenantId,
        name: raw.name,
        isActive: raw.isActive,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    )
  }

  static toPersistence(pipeline: Pipeline) {
    return {
      id: pipeline.id.toString(),
      tenantId: pipeline.tenantId,
      name: pipeline.name,
      isActive: pipeline.isActive,
    }
  }
}
