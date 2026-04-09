import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ILeadFieldConfigRepository } from '../../repositories/i-lead-field-config.repository'
import { LeadFieldConfig } from '../../../enterprise/entities/lead-field-config.entity'

export interface UpdateLeadFieldConfigRequest {
  configId: string
  tenantId: string
  updates: {
    label?: string
    isRequired?: boolean
    isActive?: boolean
    order?: number
    options?: string[]
  }
}

export type UpdateLeadFieldConfigResult = Either<Error, { config: LeadFieldConfig }>

@Injectable()
export class UpdateLeadFieldConfigUseCase {
  constructor(private readonly repo: ILeadFieldConfigRepository) {}

  async execute(req: UpdateLeadFieldConfigRequest): Promise<UpdateLeadFieldConfigResult> {
    const findResult = await this.repo.findById(req.configId)
    if (findResult.isLeft()) return left(findResult.value)
    if (!findResult.value) return left(new Error('Field config not found'))
    if (findResult.value.tenantId !== req.tenantId) return left(new Error('Not found'))

    findResult.value.update(req.updates)

    const saveResult = await this.repo.save(findResult.value)
    if (saveResult.isLeft()) return left(saveResult.value)

    return right({ config: findResult.value })
  }
}
