import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IPipelineRepository } from '../../repositories/i-pipeline.repository'
import { Pipeline } from '../../../enterprise/entities/pipeline.entity'
import { PipelineNotFoundError } from '../../errors/pipeline-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { RoleType, UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export interface UpdatePipelineRequest {
  pipelineId: string
  tenantId: string
  actorRole: RoleType
  updates: {
    name?: string
    isActive?: boolean
  }
}

export type UpdatePipelineResult = Either<PipelineNotFoundError | UnauthorizedError | Error, Pipeline>

@Injectable()
export class UpdatePipelineUseCase {
  constructor(private readonly pipelineRepo: IPipelineRepository) {}

  async execute(req: UpdatePipelineRequest): Promise<UpdatePipelineResult> {
    const role = UserRole.create(req.actorRole)

    if (!role.canManagePipelines()) {
      return left(new UnauthorizedError('Only ACCOUNT_ADMIN or higher can manage pipelines'))
    }

    const pipelineResult = await this.pipelineRepo.findById(req.pipelineId, req.tenantId)
    if (pipelineResult.isLeft()) return left(pipelineResult.value)
    if (!pipelineResult.value) return left(new PipelineNotFoundError())

    const pipeline = pipelineResult.value

    if (req.updates.name !== undefined) pipeline.rename(req.updates.name)
    if (req.updates.isActive === false) pipeline.deactivate()

    const saveResult = await this.pipelineRepo.save(pipeline)
    if (saveResult.isLeft()) return left(saveResult.value)

    return right(pipeline)
  }
}
