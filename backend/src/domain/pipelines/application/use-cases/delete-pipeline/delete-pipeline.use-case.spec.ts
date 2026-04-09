import { describe, it, expect, beforeEach } from 'vitest'
import { DeletePipelineUseCase } from './delete-pipeline.use-case'
import { InMemoryPipelineRepository } from '@/test/repositories/in-memory-pipeline.repository'
import { makePipeline } from '@/test/factories/make-pipeline'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { PipelineNotFoundError } from '../../errors/pipeline-not-found.error'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

const TENANT_ID = 'tenant-1'

describe('DeletePipelineUseCase', () => {
  let sut: DeletePipelineUseCase
  let pipelineRepo: InMemoryPipelineRepository

  beforeEach(() => {
    pipelineRepo = new InMemoryPipelineRepository()
    sut = new DeletePipelineUseCase(pipelineRepo)
  })

  it('ACCOUNT_ADMIN deletes pipeline', async () => {
    const pipeline = makePipeline({ tenantId: TENANT_ID }, new UniqueEntityID('pipeline-1'))
    pipelineRepo.items.push(pipeline)

    const result = await sut.execute({
      pipelineId: 'pipeline-1',
      tenantId: TENANT_ID,
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isRight()).toBe(true)
    expect(pipelineRepo.items).toHaveLength(0)
  })

  it('MEMBER returns UnauthorizedError', async () => {
    const pipeline = makePipeline({ tenantId: TENANT_ID }, new UniqueEntityID('pipeline-2'))
    pipelineRepo.items.push(pipeline)

    const result = await sut.execute({
      pipelineId: 'pipeline-2',
      tenantId: TENANT_ID,
      actorRole: 'MEMBER',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('pipeline not found returns PipelineNotFoundError', async () => {
    const result = await sut.execute({
      pipelineId: 'non-existent',
      tenantId: TENANT_ID,
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PipelineNotFoundError)
  })
})
