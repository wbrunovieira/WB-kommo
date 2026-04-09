import { describe, it, expect, beforeEach } from 'vitest'
import { UpdateStageUseCase } from './update-stage.use-case'
import { InMemoryStageRepository } from '@/test/repositories/in-memory-stage.repository'
import { InMemoryPipelineRepository } from '@/test/repositories/in-memory-pipeline.repository'
import { Stage } from '@/domain/pipelines/enterprise/entities/stage.entity'
import { Pipeline } from '@/domain/pipelines/enterprise/entities/pipeline.entity'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { StageNotFoundError } from '../../errors/stage-not-found.error'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'

function makeStage(overrides: { id?: string; pipelineId?: string } = {}) {
  return Stage.create(
    { pipelineId: overrides.pipelineId ?? 'pipeline-1', name: 'Initial', order: 1, color: '#aaaaaa' },
    overrides.id ? new UniqueEntityID(overrides.id) : undefined,
  )
}

function makePipeline(id = 'pipeline-1', tenantId = 'tenant-1') {
  return Pipeline.create({ tenantId, name: 'Test Pipeline' }, new UniqueEntityID(id))
}

describe('UpdateStageUseCase', () => {
  let sut: UpdateStageUseCase
  let stageRepo: InMemoryStageRepository
  let pipelineRepo: InMemoryPipelineRepository

  beforeEach(() => {
    stageRepo = new InMemoryStageRepository()
    pipelineRepo = new InMemoryPipelineRepository()
    sut = new UpdateStageUseCase(pipelineRepo, stageRepo)
  })

  it('should update stage name', async () => {
    const pipeline = makePipeline()
    pipelineRepo.items.push(pipeline)
    const stage = makeStage({ id: 'stage-1', pipelineId: 'pipeline-1' })
    stageRepo.items.push(stage)

    const result = await sut.execute({
      stageId: 'stage-1',
      pipelineId: 'pipeline-1',
      tenantId: 'tenant-1',
      actorRole: 'ACCOUNT_ADMIN',
      name: 'Updated Name',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.stage.name).toBe('Updated Name')
    }
  })

  it('should update stage color', async () => {
    const pipeline = makePipeline()
    pipelineRepo.items.push(pipeline)
    const stage = makeStage({ id: 'stage-1' })
    stageRepo.items.push(stage)

    const result = await sut.execute({
      stageId: 'stage-1',
      pipelineId: 'pipeline-1',
      tenantId: 'tenant-1',
      actorRole: 'ACCOUNT_ADMIN',
      color: '#ff0000',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.stage.color).toBe('#ff0000')
    }
  })

  it('should return StageNotFoundError for unknown stage', async () => {
    const pipeline = makePipeline()
    pipelineRepo.items.push(pipeline)

    const result = await sut.execute({
      stageId: 'unknown',
      pipelineId: 'pipeline-1',
      tenantId: 'tenant-1',
      actorRole: 'ACCOUNT_ADMIN',
      name: 'X',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(StageNotFoundError)
  })

  it('should return UnauthorizedError for MEMBER', async () => {
    const pipeline = makePipeline()
    pipelineRepo.items.push(pipeline)
    const stage = makeStage({ id: 'stage-1' })
    stageRepo.items.push(stage)

    const result = await sut.execute({
      stageId: 'stage-1',
      pipelineId: 'pipeline-1',
      tenantId: 'tenant-1',
      actorRole: 'MEMBER',
      name: 'X',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })
})
