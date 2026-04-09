import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IPipelineRepository } from '../../repositories/i-pipeline.repository'
import { IStageRepository } from '../../repositories/i-stage.repository'
import { Stage } from '../../../enterprise/entities/stage.entity'
import { StageNotFoundError } from '../../errors/stage-not-found.error'
import { PipelineNotFoundError } from '../../errors/pipeline-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { RoleType, UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export interface UpdateStageRequest {
  stageId: string
  pipelineId: string
  tenantId: string
  actorRole: RoleType
  name?: string
  color?: string
}

export interface UpdateStageResponse {
  stage: Stage
}

export type UpdateStageResult = Either<
  StageNotFoundError | PipelineNotFoundError | UnauthorizedError | Error,
  UpdateStageResponse
>

@Injectable()
export class UpdateStageUseCase {
  constructor(
    private readonly pipelineRepo: IPipelineRepository,
    private readonly stageRepo: IStageRepository,
  ) {}

  async execute(req: UpdateStageRequest): Promise<UpdateStageResult> {
    const role = UserRole.create(req.actorRole)
    if (!role.canManagePipelines()) {
      return left(new UnauthorizedError('Only ACCOUNT_ADMIN or higher can manage stages'))
    }

    const pipelineResult = await this.pipelineRepo.findById(req.pipelineId, req.tenantId)
    if (pipelineResult.isLeft()) return left(pipelineResult.value)
    if (!pipelineResult.value) return left(new PipelineNotFoundError())

    const stageResult = await this.stageRepo.findById(req.stageId)
    if (stageResult.isLeft()) return left(stageResult.value)
    if (!stageResult.value) return left(new StageNotFoundError())

    const stage = stageResult.value

    if (req.name !== undefined) stage.rename(req.name)
    if (req.color !== undefined) stage.recolor(req.color)

    const saveResult = await this.stageRepo.save(stage)
    if (saveResult.isLeft()) return left(saveResult.value)

    return right({ stage })
  }
}
