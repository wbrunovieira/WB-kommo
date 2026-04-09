import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ILeadFieldConfigRepository } from '../../repositories/i-lead-field-config.repository'

export interface DeleteLeadFieldConfigRequest {
  configId: string
  tenantId: string
}

export type DeleteLeadFieldConfigResult = Either<Error, void>

@Injectable()
export class DeleteLeadFieldConfigUseCase {
  constructor(private readonly repo: ILeadFieldConfigRepository) {}

  async execute(req: DeleteLeadFieldConfigRequest): Promise<DeleteLeadFieldConfigResult> {
    const findResult = await this.repo.findById(req.configId)
    if (findResult.isLeft()) return left(findResult.value)
    if (!findResult.value) return left(new Error('Field config not found'))
    if (findResult.value.tenantId !== req.tenantId) return left(new Error('Not found'))
    if (findResult.value.isBuiltin) return left(new Error('Cannot delete a built-in field'))

    return this.repo.delete(req.configId)
  }
}
