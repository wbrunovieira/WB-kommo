import { describe, it, expect, beforeEach } from 'vitest'
import { CreateStageUseCase } from './create-stage.use-case'
import { InMemoryPipelineRepository } from '@/test/repositories/in-memory-pipeline.repository'
import { InMemoryStageRepository } from '@/test/repositories/in-memory-stage.repository'
import { makePipeline } from '@/test/factories/make-pipeline'
import { makeStage } from '@/test/factories/make-stage'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { PipelineNotFoundError } from '../../errors/pipeline-not-found.error'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

const TENANT_ID = 'tenant-1'
const PIPELINE_ID = 'pipeline-1'

describe('CreateStageUseCase', () => {
  let sut: CreateStageUseCase
  let pipelineRepo: InMemoryPipelineRepository
  let stageRepo: InMemoryStageRepository

  beforeEach(() => {
    pipelineRepo = new InMemoryPipelineRepository()
    stageRepo = new InMemoryStageRepository()
    sut = new CreateStageUseCase(pipelineRepo, stageRepo)
  })

  it('ACCOUNT_ADMIN creates stage in pipeline', async () => {
    pipelineRepo.items.push(makePipeline({ tenantId: TENANT_ID }, new UniqueEntityID(PIPELINE_ID)))

    const result = await sut.execute({
      pipelineId: PIPELINE_ID,
      tenantId: TENANT_ID,
      name: 'New Stage',
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value.stageId).toBeDefined()
    expect(stageRepo.items).toHaveLength(1)
  })

  it('MEMBER returns UnauthorizedError', async () => {
    pipelineRepo.items.push(makePipeline({ tenantId: TENANT_ID }, new UniqueEntityID(PIPELINE_ID)))

    const result = await sut.execute({
      pipelineId: PIPELINE_ID,
      tenantId: TENANT_ID,
      name: 'Unauthorized Stage',
      actorRole: 'MEMBER',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('pipeline not found returns PipelineNotFoundError', async () => {
    const result = await sut.execute({
      pipelineId: 'non-existent',
      tenantId: TENANT_ID,
      name: 'Stage',
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PipelineNotFoundError)
  })

  it('order auto-assigned as max(existing) + 1 when not provided', async () => {
    pipelineRepo.items.push(makePipeline({ tenantId: TENANT_ID }, new UniqueEntityID(PIPELINE_ID)))
    stageRepo.items.push(makeStage({ pipelineId: PIPELINE_ID, order: 1 }))
    stageRepo.items.push(makeStage({ pipelineId: PIPELINE_ID, order: 3 }))

    const result = await sut.execute({
      pipelineId: PIPELINE_ID,
      tenantId: TENANT_ID,
      name: 'Auto Order Stage',
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isRight()).toBe(true)
    // Max existing order is 3, so new stage should be 4
    const newStage = stageRepo.items.find((s) => s.name === 'Auto Order Stage')
    expect(newStage?.order).toBe(4)
  })

  it('explicit order is respected when provided', async () => {
    pipelineRepo.items.push(makePipeline({ tenantId: TENANT_ID }, new UniqueEntityID(PIPELINE_ID)))
    stageRepo.items.push(makeStage({ pipelineId: PIPELINE_ID, order: 1 }))

    const result = await sut.execute({
      pipelineId: PIPELINE_ID,
      tenantId: TENANT_ID,
      name: 'Explicit Order Stage',
      order: 5,
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isRight()).toBe(true)
    const newStage = stageRepo.items.find((s) => s.name === 'Explicit Order Stage')
    expect(newStage?.order).toBe(5)
  })
})
