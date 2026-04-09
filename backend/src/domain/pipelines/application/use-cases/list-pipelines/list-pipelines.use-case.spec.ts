import { describe, it, expect, beforeEach } from 'vitest'
import { ListPipelinesUseCase } from './list-pipelines.use-case'
import { InMemoryPipelineRepository } from '@/test/repositories/in-memory-pipeline.repository'
import { makePipeline } from '@/test/factories/make-pipeline'

const TENANT_ID = 'tenant-1'
const OTHER_TENANT_ID = 'other-tenant'

describe('ListPipelinesUseCase', () => {
  let sut: ListPipelinesUseCase
  let pipelineRepo: InMemoryPipelineRepository

  beforeEach(() => {
    pipelineRepo = new InMemoryPipelineRepository()
    sut = new ListPipelinesUseCase(pipelineRepo)
  })

  it('returns all active pipelines for a tenant', async () => {
    pipelineRepo.items.push(
      makePipeline({ tenantId: TENANT_ID, name: 'Pipeline A' }),
      makePipeline({ tenantId: TENANT_ID, name: 'Pipeline B' }),
      makePipeline({ tenantId: OTHER_TENANT_ID, name: 'Other Tenant Pipeline' }),
    )

    const result = await sut.execute({ tenantId: TENANT_ID })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value).toHaveLength(2)
    expect(result.value.every((p) => p.tenantId === TENANT_ID)).toBe(true)
  })

  it('returns empty array when no pipelines', async () => {
    const result = await sut.execute({ tenantId: TENANT_ID })

    expect(result.isRight()).toBe(true)
    if (!result.isRight()) return
    expect(result.value).toHaveLength(0)
  })
})
