import { describe, it, expect, beforeEach } from 'vitest'
import { ListStagesUseCase } from './list-stages.use-case'
import { InMemoryPipelineRepository } from '@/test/repositories/in-memory-pipeline.repository'
import { InMemoryStageRepository } from '@/test/repositories/in-memory-stage.repository'
import { makePipeline } from '@/test/factories/make-pipeline'
import { makeStage } from '@/test/factories/make-stage'
import { PipelineNotFoundError } from '../../errors/pipeline-not-found.error'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

const TENANT_ID = 'tenant-1'
const PIPELINE_ID = 'pipeline-1'

describe('ListStagesUseCase', () => {
  let sut: ListStagesUseCase
  let pipelineRepo: InMemoryPipelineRepository
  let stageRepo: InMemoryStageRepository

  beforeEach(() => {
    pipelineRepo = new InMemoryPipelineRepository()
    stageRepo = new InMemoryStageRepository()
    sut = new ListStagesUseCase(pipelineRepo, stageRepo)
  })

  it('any authenticated user can list stages for a pipeline in their tenant', async () => {
    pipelineRepo.items.push(makePipeline({ tenantId: TENANT_ID }, new UniqueEntityID(PIPELINE_ID)))
    stageRepo.items.push(makeStage({ pipelineId: PIPELINE_ID, order: 1 }))
    stageRepo.items.push(makeStage({ pipelineId: PIPELINE_ID, order: 2 }))

    const result = await sut.execute({
      pipelineId: PIPELINE_ID,
      tenantId: TENANT_ID,
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value).toHaveLength(2)
  })

  it('returns stages ordered by order field', async () => {
    pipelineRepo.items.push(makePipeline({ tenantId: TENANT_ID }, new UniqueEntityID(PIPELINE_ID)))
    stageRepo.items.push(makeStage({ pipelineId: PIPELINE_ID, order: 3, name: 'Third' }))
    stageRepo.items.push(makeStage({ pipelineId: PIPELINE_ID, order: 1, name: 'First' }))
    stageRepo.items.push(makeStage({ pipelineId: PIPELINE_ID, order: 2, name: 'Second' }))

    const result = await sut.execute({
      pipelineId: PIPELINE_ID,
      tenantId: TENANT_ID,
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value[0].name).toBe('First')
    expect(result.value[1].name).toBe('Second')
    expect(result.value[2].name).toBe('Third')
  })

  it('returns empty array when pipeline has no stages', async () => {
    pipelineRepo.items.push(makePipeline({ tenantId: TENANT_ID }, new UniqueEntityID(PIPELINE_ID)))

    const result = await sut.execute({
      pipelineId: PIPELINE_ID,
      tenantId: TENANT_ID,
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value).toHaveLength(0)
  })

  it('pipeline not found returns PipelineNotFoundError (tenant scope check)', async () => {
    // Pipeline exists but in different tenant
    pipelineRepo.items.push(makePipeline({ tenantId: 'other-tenant' }, new UniqueEntityID(PIPELINE_ID)))

    const result = await sut.execute({
      pipelineId: PIPELINE_ID,
      tenantId: TENANT_ID,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PipelineNotFoundError)
  })
})
