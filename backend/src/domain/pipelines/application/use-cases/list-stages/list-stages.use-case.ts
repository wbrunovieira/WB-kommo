import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IPipelineRepository } from '../../repositories/i-pipeline.repository'
import { IStageRepository } from '../../repositories/i-stage.repository'
import { Stage } from '../../../enterprise/entities/stage.entity'
import { PipelineNotFoundError } from '../../errors/pipeline-not-found.error'

export interface ListStagesRequest {
  pipelineId: string
  tenantId: string
}

export type ListStagesResult = Either<PipelineNotFoundError | Error, Stage[]>

@Injectable()
export class ListStagesUseCase {
  constructor(
    private readonly pipelineRepo: IPipelineRepository,
    private readonly stageRepo: IStageRepository,
  ) {}

  async execute(req: ListStagesRequest): Promise<ListStagesResult> {
    // Verify pipeline exists in tenant scope
    const pipelineResult = await this.pipelineRepo.findById(req.pipelineId, req.tenantId)
    if (pipelineResult.isLeft()) return left(pipelineResult.value)
    if (!pipelineResult.value) return left(new PipelineNotFoundError())

    const stagesResult = await this.stageRepo.findByPipeline(req.pipelineId)
    if (stagesResult.isLeft()) return left(stagesResult.value)

    return right(stagesResult.value)
  }
}
