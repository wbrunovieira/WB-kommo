import { Either, right } from '@/core/errors/either'
import { IPipelineRepository } from '@/domain/pipelines/application/repositories/i-pipeline.repository'
import { Pipeline } from '@/domain/pipelines/enterprise/entities/pipeline.entity'

export class InMemoryPipelineRepository implements IPipelineRepository {
  public items: Pipeline[] = []

  async findById(id: string, tenantId: string): Promise<Either<Error, Pipeline | null>> {
    const pipeline = this.items.find(
      (p) => p.id.toString() === id && p.tenantId === tenantId,
    )
    return right(pipeline ?? null)
  }

  async findByTenant(tenantId: string): Promise<Either<Error, Pipeline[]>> {
    const pipelines = this.items.filter((p) => p.tenantId === tenantId)
    return right(pipelines)
  }

  async save(pipeline: Pipeline): Promise<Either<Error, void>> {
    const existingIndex = this.items.findIndex((p) => p.id.equals(pipeline.id))
    if (existingIndex >= 0) {
      this.items[existingIndex] = pipeline
    } else {
      this.items.push(pipeline)
    }
    return right(undefined)
  }

  async delete(id: string): Promise<Either<Error, void>> {
    this.items = this.items.filter((p) => p.id.toString() !== id)
    return right(undefined)
  }
}
