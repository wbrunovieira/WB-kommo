import { AggregateRoot } from '../../aggregate-root'
import { UniqueEntityID } from '../../utils/unique-entity-id'
import { DomainEvent } from './domain-event'

type DomainEventHandler = (event: DomainEvent) => void

export class DomainEvents {
  private static handlersMap: Map<string, DomainEventHandler[]> = new Map()
  private static markedAggregates: AggregateRoot<unknown>[] = []

  static markAggregateForDispatch(aggregate: AggregateRoot<unknown>): void {
    const found = this.markedAggregates.find((a) => a.equals(aggregate))
    if (!found) {
      this.markedAggregates.push(aggregate)
    }
  }

  static dispatchEventsForAggregate(id: UniqueEntityID): void {
    const aggregate = this.markedAggregates.find((a) => a.id.equals(id))
    if (aggregate) {
      aggregate.domainEvents.forEach((event) => this.dispatch(event))
      aggregate.clearDomainEvents()
      this.removeAggregateFromMarkedList(aggregate)
    }
  }

  static register(handler: DomainEventHandler, eventClassName: string): void {
    const handlers = this.handlersMap.get(eventClassName) ?? []
    handlers.push(handler)
    this.handlersMap.set(eventClassName, handlers)
  }

  static clearHandlers(): void {
    this.handlersMap.clear()
  }

  static clearMarkedAggregates(): void {
    this.markedAggregates = []
  }

  private static dispatch(event: DomainEvent): void {
    const eventName = event.constructor.name
    const handlers = this.handlersMap.get(eventName) ?? []
    handlers.forEach((handler) => handler(event))
  }

  private static removeAggregateFromMarkedList(
    aggregate: AggregateRoot<unknown>,
  ): void {
    this.markedAggregates = this.markedAggregates.filter(
      (a) => !a.equals(aggregate),
    )
  }
}
