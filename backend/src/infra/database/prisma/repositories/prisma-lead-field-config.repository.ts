import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { PrismaService } from '../prisma.service'
import { ILeadFieldConfigRepository } from '@/domain/leads/application/repositories/i-lead-field-config.repository'
import { LeadFieldConfig } from '@/domain/leads/enterprise/entities/lead-field-config.entity'
import { PrismaLeadFieldConfigMapper } from '../mappers/prisma-lead-field-config.mapper'

@Injectable()
export class PrismaLeadFieldConfigRepository implements ILeadFieldConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string): Promise<Either<Error, LeadFieldConfig[]>> {
    try {
      const rows = await this.prisma.leadFieldConfig.findMany({
        where: { tenantId },
        orderBy: { order: 'asc' },
      })
      return right(rows.map(PrismaLeadFieldConfigMapper.toDomain))
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async findById(id: string): Promise<Either<Error, LeadFieldConfig | null>> {
    try {
      const row = await this.prisma.leadFieldConfig.findUnique({ where: { id } })
      return right(row ? PrismaLeadFieldConfigMapper.toDomain(row) : null)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async findByTenantAndKey(tenantId: string, key: string): Promise<Either<Error, LeadFieldConfig | null>> {
    try {
      const row = await this.prisma.leadFieldConfig.findUnique({ where: { tenantId_key: { tenantId, key } } })
      return right(row ? PrismaLeadFieldConfigMapper.toDomain(row) : null)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async save(config: LeadFieldConfig): Promise<Either<Error, void>> {
    try {
      const data = PrismaLeadFieldConfigMapper.toPersistence(config)
      await this.prisma.leadFieldConfig.upsert({
        where: { id: data.id },
        create: data,
        update: {
          label: data.label,
          isRequired: data.isRequired,
          isActive: data.isActive,
          isBuiltin: data.isBuiltin,
          order: data.order,
          options: data.options,
        },
      })
      return right(undefined)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async saveMany(configs: LeadFieldConfig[]): Promise<Either<Error, void>> {
    try {
      for (const config of configs) {
        const r = await this.save(config)
        if (r.isLeft()) return r
      }
      return right(undefined)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async delete(id: string): Promise<Either<Error, void>> {
    try {
      await this.prisma.leadFieldConfig.delete({ where: { id } })
      return right(undefined)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }
}
