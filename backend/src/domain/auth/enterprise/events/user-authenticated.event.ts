import { DomainEvent } from '@/core/domain/events/domain-event'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export class UserAuthenticatedEvent implements DomainEvent {
  ocurredAt = new Date()

  constructor(
    private readonly aggregateId: UniqueEntityID,
    public readonly tenantId: string,
    public readonly ipAddress?: string,
  ) {}

  getAggregateId(): UniqueEntityID {
    return this.aggregateId
  }
}
