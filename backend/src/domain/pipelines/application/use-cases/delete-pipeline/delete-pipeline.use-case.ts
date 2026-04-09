import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IPipelineRepository } from '../../repositories/i-pipeline.repository'
import { PipelineNotFoundError } from '../../errors/pipeline-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { RoleType, UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export interface DeletePipelineRequest {
  pipelineId: string
  tenantId: string
  actorRole: RoleType
}

export type DeletePipelineResult = Either<PipelineNotFoundError | UnauthorizedError | Error, void>

@Injectable()
export class DeletePipelineUseCase {
  constructor(private readonly pipelineRepo: IPipelineRepository) {}

  async execute(req: DeletePipelineRequest): Promise<DeletePipelineResult> {
    const role = UserRole.create(req.actorRole)

    if (!role.canManagePipelines()) {
      return left(new UnauthorizedError('Only ACCOUNT_ADMIN or higher can manage pipelines'))
    }

    const pipelineResult = await this.pipelineRepo.findById(req.pipelineId, req.tenantId)
    if (pipelineResult.isLeft()) return left(pipelineResult.value)
    if (!pipelineResult.value) return left(new PipelineNotFoundError())

    const deleteResult = await this.pipelineRepo.delete(req.pipelineId)
    if (deleteResult.isLeft()) return left(deleteResult.value)

    return right(undefined)
  }
}
