import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IPipelineRepository } from '@/domain/pipelines/application/repositories/i-pipeline.repository'
import { Pipeline } from '@/domain/pipelines/enterprise/entities/pipeline.entity'
import { PrismaService } from '../prisma.service'
import { PrismaPipelineMapper } from '../mappers/prisma-pipeline.mapper'

@Injectable()
export class PrismaPipelineRepository implements IPipelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<Either<Error, Pipeline | null>> {
    try {
      const raw = await this.prisma.pipeline.findFirst({
        where: { id, tenantId },
      })
      return right(raw ? PrismaPipelineMapper.toDomain(raw) : null)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async findByTenant(tenantId: string): Promise<Either<Error, Pipeline[]>> {
    try {
      const raws = await this.prisma.pipeline.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
      })
      return right(raws.map(PrismaPipelineMapper.toDomain))
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async save(pipeline: Pipeline): Promise<Either<Error, void>> {
    try {
      const data = PrismaPipelineMapper.toPersistence(pipeline)
      await this.prisma.pipeline.upsert({
        where: { id: data.id },
        create: data,
        update: { ...data, id: undefined },
      })
      return right(undefined)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async delete(id: string): Promise<Either<Error, void>> {
    try {
      await this.prisma.pipeline.delete({ where: { id } })
      return right(undefined)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }
}
