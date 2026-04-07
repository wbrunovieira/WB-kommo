import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AggregateRoot } from './aggregate-root'
import { UniqueEntityID } from './utils/unique-entity-id'
import { DomainEvent } from './domain/events/domain-event'
import { DomainEvents } from './domain/events/domain-events'

// ── stubs ─────────────────────────────────────────────────────────────────────

class StubCreatedEvent implements DomainEvent {
  ocurredAt = new Date()

  constructor(private readonly aggregateId: UniqueEntityID) {}

  getAggregateId(): UniqueEntityID {
    return this.aggregateId
  }
}

interface StubAggProps {
  value: string
}

class StubAggregate extends AggregateRoot<StubAggProps> {
  static create(props: StubAggProps, id?: UniqueEntityID): StubAggregate {
    const agg = new StubAggregate(props, id)
    agg.addDomainEvent(new StubCreatedEvent(agg.id))
    DomainEvents.markAggregateForDispatch(agg)
    return agg
  }

  get value(): string {
    return this.props.value
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('AggregateRoot', () => {
  afterEach(() => {
    DomainEvents.clearHandlers()
    DomainEvents.clearMarkedAggregates()
  })

  it('should store domain events when created', () => {
    const agg = StubAggregate.create({ value: 'hello' })
    expect(agg.domainEvents).toHaveLength(1)
    expect(agg.domainEvents[0]).toBeInstanceOf(StubCreatedEvent)
  })

  it('should clear domain events after clearDomainEvents()', () => {
    const agg = StubAggregate.create({ value: 'hello' })
    agg.clearDomainEvents()
    expect(agg.domainEvents).toHaveLength(0)
  })

  it('should dispatch events to registered handlers', () => {
    const received: DomainEvent[] = []
    DomainEvents.register(
      (e) => received.push(e),
      StubCreatedEvent.name,
    )

    const agg = StubAggregate.create({ value: 'hello' })
    DomainEvents.dispatchEventsForAggregate(agg.id)

    expect(received).toHaveLength(1)
    expect(received[0]).toBeInstanceOf(StubCreatedEvent)
  })

  it('should clear events from aggregate after dispatch', () => {
    const agg = StubAggregate.create({ value: 'hello' })
    DomainEvents.dispatchEventsForAggregate(agg.id)
    expect(agg.domainEvents).toHaveLength(0)
  })

  it('should not dispatch same aggregate twice', () => {
    const received: DomainEvent[] = []
    DomainEvents.register((e) => received.push(e), StubCreatedEvent.name)

    const agg = StubAggregate.create({ value: 'hello' })
    DomainEvents.dispatchEventsForAggregate(agg.id)
    DomainEvents.dispatchEventsForAggregate(agg.id)

    expect(received).toHaveLength(1)
  })
})
