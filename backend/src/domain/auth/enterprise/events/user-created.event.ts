import { DomainEvent } from '@/core/domain/events/domain-event'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export class UserCreatedEvent implements DomainEvent {
  ocurredAt = new Date()

  constructor(
    private readonly aggregateId: UniqueEntityID,
    public readonly tenantId: string,
    public readonly email: string,
  ) {}

  getAggregateId(): UniqueEntityID {
    return this.aggregateId
  }
}
