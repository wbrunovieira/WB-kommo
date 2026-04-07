import { DomainEvent } from '@/core/domain/events/domain-event'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'

export class UserImpersonatedEvent implements DomainEvent {
  ocurredAt = new Date()

  constructor(
    private readonly aggregateId: UniqueEntityID,
    public readonly impersonatorId: string,
    public readonly targetTenantId: string,
  ) {}

  getAggregateId(): UniqueEntityID {
    return this.aggregateId
  }
}
