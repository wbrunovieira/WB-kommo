import { Either } from '@/core/errors/either'
import { Pipeline } from '../../enterprise/entities/pipeline.entity'

export abstract class IPipelineRepository {
  abstract findById(id: string, tenantId: string): Promise<Either<Error, Pipeline | null>>
  abstract findByTenant(tenantId: string): Promise<Either<Error, Pipeline[]>>
  abstract save(pipeline: Pipeline): Promise<Either<Error, void>>
  abstract delete(id: string): Promise<Either<Error, void>>
}
