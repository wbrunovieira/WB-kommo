import { describe, it, expect, beforeEach } from 'vitest'
import { UpdatePipelineUseCase } from './update-pipeline.use-case'
import { InMemoryPipelineRepository } from '@/test/repositories/in-memory-pipeline.repository'
import { makePipeline } from '@/test/factories/make-pipeline'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'
import { PipelineNotFoundError } from '../../errors/pipeline-not-found.error'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

const TENANT_ID = 'tenant-1'
const ADMIN_ID = 'admin-user'
const MEMBER_ID = 'member-user'

describe('UpdatePipelineUseCase', () => {
  let sut: UpdatePipelineUseCase
  let pipelineRepo: InMemoryPipelineRepository

  beforeEach(() => {
    pipelineRepo = new InMemoryPipelineRepository()
    sut = new UpdatePipelineUseCase(pipelineRepo)
  })

  it('ACCOUNT_ADMIN renames pipeline', async () => {
    const pipeline = makePipeline({ tenantId: TENANT_ID, name: 'Old Name' }, new UniqueEntityID('pipeline-1'))
    pipelineRepo.items.push(pipeline)

    const result = await sut.execute({
      pipelineId: 'pipeline-1',
      tenantId: TENANT_ID,
      actorRole: 'ACCOUNT_ADMIN',
      updates: { name: 'New Name' },
    })

    expect(result.isRight()).toBe(true)
    expect(pipelineRepo.items[0].name).toBe('New Name')
  })

  it('ACCOUNT_ADMIN deactivates pipeline', async () => {
    const pipeline = makePipeline({ tenantId: TENANT_ID }, new UniqueEntityID('pipeline-2'))
    pipelineRepo.items.push(pipeline)

    const result = await sut.execute({
      pipelineId: 'pipeline-2',
      tenantId: TENANT_ID,
      actorRole: 'ACCOUNT_ADMIN',
      updates: { isActive: false },
    })

    expect(result.isRight()).toBe(true)
    expect(pipelineRepo.items[0].isActive).toBe(false)
  })

  it('MEMBER returns UnauthorizedError', async () => {
    const pipeline = makePipeline({ tenantId: TENANT_ID }, new UniqueEntityID('pipeline-3'))
    pipelineRepo.items.push(pipeline)

    const result = await sut.execute({
      pipelineId: 'pipeline-3',
      tenantId: TENANT_ID,
      actorRole: 'MEMBER',
      updates: { name: 'Unauthorized' },
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('pipeline not found returns PipelineNotFoundError', async () => {
    const result = await sut.execute({
      pipelineId: 'non-existent',
      tenantId: TENANT_ID,
      actorRole: 'ACCOUNT_ADMIN',
      updates: { name: 'New Name' },
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(PipelineNotFoundError)
  })
})
