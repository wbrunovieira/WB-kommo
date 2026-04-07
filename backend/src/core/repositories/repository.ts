import { Entity } from '../entity'
import { UniqueEntityID } from '../utils/unique-entity-id'
import { Either } from '../errors/either'

export abstract class IRepository<T extends Entity<unknown>> {
  abstract findById(id: UniqueEntityID): Promise<Either<Error, T | null>>
  abstract save(entity: T): Promise<Either<Error, void>>
  abstract delete(id: UniqueEntityID): Promise<Either<Error, void>>
}
