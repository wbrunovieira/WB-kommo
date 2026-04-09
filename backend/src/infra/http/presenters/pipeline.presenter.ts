import { Pipeline } from '@/domain/pipelines/enterprise/entities/pipeline.entity'
import { Stage } from '@/domain/pipelines/enterprise/entities/stage.entity'

export interface PipelineHttpResponse {
  id: string
  tenantId: string
  name: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface StageHttpResponse {
  id: string
  pipelineId: string
  name: string
  order: number
  color?: string
  createdAt?: Date
  updatedAt?: Date
}

export class PipelinePresenter {
  static toHttp(pipeline: Pipeline): PipelineHttpResponse {
    return {
      id: pipeline.id.toString(),
      tenantId: pipeline.tenantId,
      name: pipeline.name,
      isActive: pipeline.isActive,
      createdAt: pipeline.createdAt,
      updatedAt: pipeline.updatedAt,
    }
  }

  static toHttpList(pipelines: Pipeline[]): PipelineHttpResponse[] {
    return pipelines.map(PipelinePresenter.toHttp)
  }
}

export class StagePresenter {
  static toHttp(stage: Stage): StageHttpResponse {
    return {
      id: stage.id.toString(),
      pipelineId: stage.pipelineId,
      name: stage.name,
      order: stage.order,
      color: stage.color,
      createdAt: stage.createdAt,
      updatedAt: stage.updatedAt,
    }
  }

  static toHttpList(stages: Stage[]): StageHttpResponse[] {
    return stages.map(StagePresenter.toHttp)
  }
}
