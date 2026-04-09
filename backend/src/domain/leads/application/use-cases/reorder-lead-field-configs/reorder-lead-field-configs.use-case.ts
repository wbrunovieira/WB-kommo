import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ILeadFieldConfigRepository } from '../../repositories/i-lead-field-config.repository'

export interface ReorderLeadFieldConfigsRequest {
  tenantId: string
  order: Array<{ configId: string; order: number }>
}

export type ReorderLeadFieldConfigsResult = Either<Error, void>

@Injectable()
export class ReorderLeadFieldConfigsUseCase {
  constructor(private readonly repo: ILeadFieldConfigRepository) {}

  async execute(req: ReorderLeadFieldConfigsRequest): Promise<ReorderLeadFieldConfigsResult> {
    for (const item of req.order) {
      const findResult = await this.repo.findById(item.configId)
      if (findResult.isLeft()) return left(findResult.value)
      if (!findResult.value || findResult.value.tenantId !== req.tenantId) continue

      findResult.value.update({ order: item.order })
      const saveResult = await this.repo.save(findResult.value)
      if (saveResult.isLeft()) return left(saveResult.value)
    }
    return right(undefined)
  }
}
