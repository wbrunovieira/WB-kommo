import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IPipelineRepository } from '../../repositories/i-pipeline.repository'
import { IStageRepository } from '../../repositories/i-stage.repository'
import { Stage } from '../../../enterprise/entities/stage.entity'
import { PipelineNotFoundError } from '../../errors/pipeline-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { RoleType, UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export interface CreateStageRequest {
  pipelineId: string
  tenantId: string
  name: string
  order?: number
  color?: string
  actorRole: RoleType
}

export interface CreateStageResponse {
  stageId: string
}

export type CreateStageResult = Either<PipelineNotFoundError | UnauthorizedError | Error, CreateStageResponse>

@Injectable()
export class CreateStageUseCase {
  constructor(
    private readonly pipelineRepo: IPipelineRepository,
    private readonly stageRepo: IStageRepository,
  ) {}

  async execute(req: CreateStageRequest): Promise<CreateStageResult> {
    const role = UserRole.create(req.actorRole)

    if (!role.canManagePipelines()) {
      return left(new UnauthorizedError('Only ACCOUNT_ADMIN or higher can manage pipelines'))
    }

    // Verify pipeline exists in tenant
    const pipelineResult = await this.pipelineRepo.findById(req.pipelineId, req.tenantId)
    if (pipelineResult.isLeft()) return left(pipelineResult.value)
    if (!pipelineResult.value) return left(new PipelineNotFoundError())

    // Determine order
    let order = req.order
    if (order === undefined) {
      const stagesResult = await this.stageRepo.findByPipeline(req.pipelineId)
      if (stagesResult.isLeft()) return left(stagesResult.value)
      const stages = stagesResult.value
      const maxOrder = stages.reduce((max, s) => Math.max(max, s.order), 0)
      order = maxOrder + 1
    }

    const stage = Stage.create({
      pipelineId: req.pipelineId,
      name: req.name,
      order,
      color: req.color,
    })

    const saveResult = await this.stageRepo.save(stage)
    if (saveResult.isLeft()) return left(saveResult.value)

    return right({ stageId: stage.id.toString() })
  }
}
