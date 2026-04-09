import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IPipelineRepository } from '../../repositories/i-pipeline.repository'
import { Pipeline } from '../../../enterprise/entities/pipeline.entity'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { RoleType, UserRole } from '@/domain/auth/enterprise/value-objects/user-role.vo'

export interface CreatePipelineRequest {
  tenantId: string
  name: string
  actorRole: RoleType
}

export interface CreatePipelineResponse {
  pipelineId: string
}

export type CreatePipelineResult = Either<UnauthorizedError | Error, CreatePipelineResponse>

@Injectable()
export class CreatePipelineUseCase {
  constructor(private readonly pipelineRepo: IPipelineRepository) {}

  async execute(req: CreatePipelineRequest): Promise<CreatePipelineResult> {
    const role = UserRole.create(req.actorRole)

    if (!role.canManagePipelines()) {
      return left(new UnauthorizedError('Only ACCOUNT_ADMIN or higher can manage pipelines'))
    }

    const pipeline = Pipeline.create({
      tenantId: req.tenantId,
      name: req.name,
    })

    const saveResult = await this.pipelineRepo.save(pipeline)
    if (saveResult.isLeft()) return left(saveResult.value)

    return right({ pipelineId: pipeline.id.toString() })
  }
}
