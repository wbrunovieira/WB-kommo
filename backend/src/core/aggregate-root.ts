import { Entity } from './entity'
import { UniqueEntityID } from './utils/unique-entity-id'
import { DomainEvent } from './domain/events/domain-event'

export abstract class AggregateRoot<Props> extends Entity<Props> {
  private _domainEvents: DomainEvent[] = []

  protected constructor(props: Props, id?: UniqueEntityID) {
    super(props, id)
  }

  get domainEvents(): DomainEvent[] {
    return this._domainEvents
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
  }

  clearDomainEvents(): void {
    this._domainEvents = []
  }
}
