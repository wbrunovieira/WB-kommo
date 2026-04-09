import { describe, it, expect, beforeEach } from 'vitest'
import { CreatePipelineUseCase } from './create-pipeline.use-case'
import { InMemoryPipelineRepository } from '@/test/repositories/in-memory-pipeline.repository'
import { UnauthorizedError } from '@/domain/auth/application/use-cases/errors/unauthorized.error'

const TENANT_ID = 'tenant-1'
const ADMIN_ID = 'admin-user'
const MEMBER_ID = 'member-user'

describe('CreatePipelineUseCase', () => {
  let sut: CreatePipelineUseCase
  let pipelineRepo: InMemoryPipelineRepository

  beforeEach(() => {
    pipelineRepo = new InMemoryPipelineRepository()
    sut = new CreatePipelineUseCase(pipelineRepo)
  })

  it('ACCOUNT_ADMIN creates pipeline successfully', async () => {
    const result = await sut.execute({
      tenantId: TENANT_ID,
      name: 'Sales Pipeline',
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value.pipelineId).toBeDefined()
    expect(pipelineRepo.items).toHaveLength(1)
  })

  it('MEMBER returns UnauthorizedError', async () => {
    const result = await sut.execute({
      tenantId: TENANT_ID,
      name: 'Sales Pipeline',
      actorRole: 'MEMBER',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(UnauthorizedError)
  })

  it('pipeline is saved with correct tenantId', async () => {
    await sut.execute({
      tenantId: TENANT_ID,
      name: 'Sales Pipeline',
      actorRole: 'ACCOUNT_ADMIN',
    })

    expect(pipelineRepo.items[0].tenantId).toBe(TENANT_ID)
    expect(pipelineRepo.items[0].name).toBe('Sales Pipeline')
  })
})
