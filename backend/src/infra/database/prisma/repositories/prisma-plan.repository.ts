import { Injectable } from '@nestjs/common'
import { Either, left, right } from '@/core/errors/either'
import { IPlanRepository } from '@/domain/plans/application/repositories/i-plan.repository'
import { Plan } from '@/domain/plans/enterprise/entities/plan.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaPlanRepository implements IPlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Either<Error, Plan | null>> {
    try {
      const raw = await this.prisma.plan.findUnique({ where: { id } })
      if (!raw) return right(null)

      return right(
        Plan.reconstitute(
          {
            name: raw.name,
            maxUsers: raw.maxUsers,
            maxLeads: raw.maxLeads,
            price: Number(raw.price),
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
          },
          new UniqueEntityID(raw.id),
        ),
      )
    } catch (e) {
      return left(e instanceof Error ? e : new Error(String(e)))
    }
  }
}
