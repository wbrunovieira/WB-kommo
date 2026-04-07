import { UniqueEntityID } from './utils/unique-entity-id'

export abstract class Entity<Props> {
  private readonly _id: UniqueEntityID
  protected props: Props

  protected constructor(props: Props, id?: UniqueEntityID) {
    this._id = id ?? new UniqueEntityID()
    this.props = props
  }

  get id(): UniqueEntityID {
    return this._id
  }

  equals(entity: Entity<unknown>): boolean {
    if (entity === this) return true
    if (!(entity instanceof Entity)) return false
    return this._id.equals(entity._id)
  }
}
