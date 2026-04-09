import { Either } from '@/core/errors/either'
import { Plan } from '../../enterprise/entities/plan.entity'

export abstract class IPlanRepository {
  abstract findById(id: string): Promise<Either<Error, Plan | null>>
}
