import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { ILeadFieldConfigRepository } from '../../repositories/i-lead-field-config.repository'
import { FieldType, LeadFieldConfig } from '../../../enterprise/entities/lead-field-config.entity'

export interface CreateLeadFieldConfigRequest {
  tenantId: string
  label: string
  type: FieldType
  isRequired: boolean
  options: string[]
}

export interface CreateLeadFieldConfigResponse {
  config: LeadFieldConfig
}

export type CreateLeadFieldConfigResult = Either<Error, CreateLeadFieldConfigResponse>

@Injectable()
export class CreateLeadFieldConfigUseCase {
  constructor(private readonly repo: ILeadFieldConfigRepository) {}

  async execute(req: CreateLeadFieldConfigRequest): Promise<CreateLeadFieldConfigResult> {
    const existingResult = await this.repo.findByTenant(req.tenantId)
    if (existingResult.isLeft()) return left(existingResult.value)

    const order = existingResult.value.length
    const key = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    const config = LeadFieldConfig.create({
      tenantId: req.tenantId,
      key,
      label: req.label,
      type: req.type,
      isRequired: req.isRequired,
      isActive: true,
      isBuiltin: false,
      order,
      options: req.options,
    })

    const saveResult = await this.repo.save(config)
    if (saveResult.isLeft()) return left(saveResult.value)

    return right({ config })
  }
}
