import { Either } from '@/core/errors/either'
import { Stage } from '../../enterprise/entities/stage.entity'

export abstract class IStageRepository {
  abstract findByPipeline(pipelineId: string): Promise<Either<Error, Stage[]>>
  abstract findById(id: string): Promise<Either<Error, Stage | null>>
  abstract save(stage: Stage): Promise<Either<Error, void>>
  abstract delete(id: string): Promise<Either<Error, void>>
}
