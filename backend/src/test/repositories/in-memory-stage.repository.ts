import { Either, right } from '@/core/errors/either'
import { IStageRepository } from '@/domain/pipelines/application/repositories/i-stage.repository'
import { Stage } from '@/domain/pipelines/enterprise/entities/stage.entity'

export class InMemoryStageRepository implements IStageRepository {
  public items: Stage[] = []

  async findByPipeline(pipelineId: string): Promise<Either<Error, Stage[]>> {
    const stages = this.items
      .filter((s) => s.pipelineId === pipelineId)
      .sort((a, b) => a.order - b.order)
    return right(stages)
  }

  async findById(id: string): Promise<Either<Error, Stage | null>> {
    const stage = this.items.find((s) => s.id.toString() === id)
    return right(stage ?? null)
  }

  async save(stage: Stage): Promise<Either<Error, void>> {
    const existingIndex = this.items.findIndex((s) => s.id.equals(stage.id))
    if (existingIndex >= 0) {
      this.items[existingIndex] = stage
    } else {
      this.items.push(stage)
    }
    return right(undefined)
  }

  async delete(id: string): Promise<Either<Error, void>> {
    this.items = this.items.filter((s) => s.id.toString() !== id)
    return right(undefined)
  }
}
