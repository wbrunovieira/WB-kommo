import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IPipelineRepository } from '../../repositories/i-pipeline.repository'
import { IStageRepository } from '../../repositories/i-stage.repository'
import { PipelineNotFoundError } from '../../errors/pipeline-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { RoleType, UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export interface ReorderStagesRequest {
  pipelineId: string
  tenantId: string
  actorRole: RoleType
  order: Array<{ stageId: string; order: number }>
}

export type ReorderStagesResult = Either<
  PipelineNotFoundError | UnauthorizedError | Error,
  void
>

@Injectable()
export class ReorderStagesUseCase {
  constructor(
    private readonly pipelineRepo: IPipelineRepository,
    private readonly stageRepo: IStageRepository,
  ) {}

  async execute(req: ReorderStagesRequest): Promise<ReorderStagesResult> {
    const role = UserRole.create(req.actorRole)
    if (!role.canManagePipelines()) {
      return left(new UnauthorizedError('Only ACCOUNT_ADMIN or higher can reorder stages'))
    }

    const pipelineResult = await this.pipelineRepo.findById(req.pipelineId, req.tenantId)
    if (pipelineResult.isLeft()) return left(pipelineResult.value)
    if (!pipelineResult.value) return left(new PipelineNotFoundError())

    for (const entry of req.order) {
      const stageResult = await this.stageRepo.findById(entry.stageId)
      if (stageResult.isLeft() || !stageResult.value) continue
      const stage = stageResult.value
      stage.reorder(entry.order)
      await this.stageRepo.save(stage)
    }

    return right(undefined)
  }
}
