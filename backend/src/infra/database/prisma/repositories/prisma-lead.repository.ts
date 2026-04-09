import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Either, left, right } from '@/core/errors/either'
import { ILeadRepository, LeadFilters } from '@/domain/leads/application/repositories/i-lead.repository'
import { Lead } from '@/domain/leads/enterprise/entities/lead.entity'
import { PrismaService } from '../prisma.service'
import { PrismaLeadMapper } from '../mappers/prisma-lead.mapper'

@Injectable()
export class PrismaLeadRepository implements ILeadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<Either<Error, Lead | null>> {
    try {
      const raw = await this.prisma.lead.findFirst({
        where: { id, tenantId },
      })
      return right(raw ? PrismaLeadMapper.toDomain(raw) : null)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async findByTenant(tenantId: string, filters?: LeadFilters): Promise<Either<Error, Lead[]>> {
    try {
      const where: Record<string, unknown> = { tenantId, deletedAt: null }
      if (filters?.pipelineId) where.pipelineId = filters.pipelineId
      if (filters?.stageId) where.stageId = filters.stageId
      if (filters?.status) where.status = filters.status
      if (filters?.assignedToId) where.assignedToId = filters.assignedToId

      const raws = await this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })
      return right(raws.map(PrismaLeadMapper.toDomain))
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async findByTenantAndOwner(tenantId: string, ownerId: string): Promise<Either<Error, Lead[]>> {
    try {
      const raws = await this.prisma.lead.findMany({
        where: { tenantId, assignedToId: ownerId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      })
      return right(raws.map(PrismaLeadMapper.toDomain))
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async countByTenant(tenantId: string): Promise<Either<Error, number>> {
    try {
      const count = await this.prisma.lead.count({ where: { tenantId, deletedAt: null } })
      return right(count)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async findDeleted(tenantId: string): Promise<Either<Error, Lead[]>> {
    try {
      const raws = await this.prisma.lead.findMany({
        where: { tenantId, deletedAt: { not: null } },
        orderBy: { deletedAt: 'desc' },
      })
      return right(raws.map(PrismaLeadMapper.toDomain))
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async save(lead: Lead): Promise<Either<Error, void>> {
    try {
      const data = PrismaLeadMapper.toPersistence(lead)
      const customFields = data.customFields !== null
        ? (data.customFields as Prisma.InputJsonValue)
        : Prisma.JsonNull

      await this.prisma.lead.upsert({
        where: { id: data.id },
        create: { ...data, customFields },
        update: { ...data, id: undefined, customFields },
      })
      return right(undefined)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }
}
