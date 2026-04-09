import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IStageRepository } from '@/domain/pipelines/application/repositories/i-stage.repository'
import { Stage } from '@/domain/pipelines/enterprise/entities/stage.entity'
import { PrismaService } from '../prisma.service'
import { PrismaStageMapper } from '../mappers/prisma-stage.mapper'

@Injectable()
export class PrismaStageRepository implements IStageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByPipeline(pipelineId: string): Promise<Either<Error, Stage[]>> {
    try {
      const raws = await this.prisma.stage.findMany({
        where: { pipelineId },
        orderBy: { order: 'asc' },
      })
      return right(raws.map(PrismaStageMapper.toDomain))
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async findById(id: string): Promise<Either<Error, Stage | null>> {
    try {
      const raw = await this.prisma.stage.findUnique({ where: { id } })
      return right(raw ? PrismaStageMapper.toDomain(raw) : null)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }

  async save(stage: Stage): Promise<Either<Error, void>> {
    try {
      const data = PrismaStageMapper.toPersistence(stage)
      await this.prisma.stage.upsert({
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
      await this.prisma.stage.delete({ where: { id } })
      return right(undefined)
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }
}
