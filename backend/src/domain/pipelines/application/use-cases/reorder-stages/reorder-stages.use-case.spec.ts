import { describe, it, expect, beforeEach } from 'vitest'
import { ReorderStagesUseCase } from './reorder-stages.use-case'
import { InMemoryStageRepository } from '@/test/repositories/in-memory-stage.repository'
import { InMemoryPipelineRepository } from '@/test/repositories/in-memory-pipeline.repository'
import { Stage } from '@/domain/pipelines/enterprise/entities/stage.entity'
import { Pipeline } from '@/domain/pipelines/enterprise/entities/pipeline.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { PipelineNotFoundError } from '../../errors/pipeline-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'

function makeStage(id: string, pipelineId: string, order: number) {
  return Stage.create(
    { pipelineId, name: `Stage ${id}`, order },
    new UniqueEntityID(id),
  )
}

function makePipeline(id = 'pipeline-1', tenantId = 'tenant-1') {
  return Pipeline.create({ tenantId, name: 'Test Pipeline' }, new UniqueEntityID(id))
}

describe('ReorderStagesUseCase', () => {
  let sut: ReorderStagesUseCase
  let stageRepo: InMemoryStageRepository
  let pipelineRepo: InMemoryPipelineRepository

  beforeEach(() => {
    stageRepo = new InMemoryStageRepository()
    pipelineRepo = new InMemoryPipelineRepository()
    sut = new ReorderStagesUseCase(pipelineRepo, stageRepo)
  })

  it('should reorder stages', async () => {
    const pipeline = makePipeline()
    pipelineRepo.items.push(pipeline)
    stageRepo.items.push(makeStage('s1', 'pipeline-1', 1))
    stageRepo.items.push(makeStage('s2', 'pipeline-1', 2))
    stageRepo.items.push(makeStage('s3', 'pipeline-1', 3))

    const result = await sut.execute({
      pipelineId: 'pipeline-1',
      tenantId: 'tenant-1',
      actorRole: 'ACCOUNT_ADMIN',
      order: [
        { stageId: 's1', order: 3 },
        { stageId: 's2', order: 1 },
        { stageId: 's3', order: 2 },
      ],
    })

    expect(result.isRight()).toBe(true)
    const s1 = stageRepo.items.find(s => s.id.toString() === 's1')
    const s2 = stageRepo.items.find(s => s.id.toString() === 's2')
    const s3 = stageRepo.items.find(s => s.id.toString() === 's3')
    expect(s1?.order).toBe(3)
    expect(s2?.order).toBe(1)
    expect(s3?.order).toBe(2)
  })

  it('should return PipelineNotFoundError for unknown pipeline', async () => {
    const result = await sut.execute({
      pipelineId: 'unknown',
      tenantId: 'tenant-1',
      actorRole: 'ACCOUNT_ADMIN',
      order: [],
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PipelineNotFoundError)
  })

  it('should return UnauthorizedError for MEMBER', async () => {
    const pipeline = makePipeline()
    pipelineRepo.items.push(pipeline)

    const result = await sut.execute({
      pipelineId: 'pipeline-1',
      tenantId: 'tenant-1',
      actorRole: 'MEMBER',
      order: [],
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })
})
