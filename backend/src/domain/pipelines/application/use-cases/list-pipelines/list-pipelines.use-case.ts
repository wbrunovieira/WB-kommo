import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IPipelineRepository } from '../../repositories/i-pipeline.repository'
import { Pipeline } from '../../../enterprise/entities/pipeline.entity'

export interface ListPipelinesRequest {
  tenantId: string
}

export type ListPipelinesResult = Either<Error, Pipeline[]>

@Injectable()
export class ListPipelinesUseCase {
  constructor(private readonly pipelineRepo: IPipelineRepository) {}

  async execute(req: ListPipelinesRequest): Promise<ListPipelinesResult> {
    const result = await this.pipelineRepo.findByTenant(req.tenantId)
    if (result.isLeft()) return left(result.value)
    return right(result.value)
  }
}
