import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ILeadFieldConfigRepository } from '../../repositories/i-lead-field-config.repository'
import { LeadFieldConfig } from '../../../enterprise/entities/lead-field-config.entity'

const DEFAULT_CONFIGS = [
  { key: 'value', label: 'Valor', type: 'NUMBER' as const, isBuiltin: true, isActive: true, isRequired: false, order: 0, options: [] },
  { key: 'email', label: 'E-mail', type: 'EMAIL' as const, isBuiltin: false, isActive: true, isRequired: false, order: 1, options: [] },
  { key: 'phone', label: 'Telefone', type: 'PHONE' as const, isBuiltin: false, isActive: true, isRequired: false, order: 2, options: [] },
]

export interface ListLeadFieldConfigsRequest {
  tenantId: string
}

export interface ListLeadFieldConfigsResponse {
  configs: LeadFieldConfig[]
}

export type ListLeadFieldConfigsResult = Either<Error, ListLeadFieldConfigsResponse>

@Injectable()
export class ListLeadFieldConfigsUseCase {
  constructor(private readonly repo: ILeadFieldConfigRepository) {}

  async execute(req: ListLeadFieldConfigsRequest): Promise<ListLeadFieldConfigsResult> {
    const listResult = await this.repo.findByTenant(req.tenantId)
    if (listResult.isLeft()) return left(listResult.value)

    if (listResult.value.length > 0) {
      return right({ configs: listResult.value })
    }

    // Seed defaults on first access
    const defaults = DEFAULT_CONFIGS.map(d =>
      LeadFieldConfig.create({ ...d, tenantId: req.tenantId }),
    )
    const saveResult = await this.repo.saveMany(defaults)
    if (saveResult.isLeft()) return left(saveResult.value)

    return right({ configs: defaults })
  }
}
