import { v4 as uuidv4 } from 'uuid'

export class UniqueEntityID {
  private readonly _value: string

  constructor(value?: string) {
    this._value = value ?? uuidv4()
  }

  get value(): string {
    return this._value
  }

  equals(id: UniqueEntityID): boolean {
    return this._value === id._value
  }

  toString(): string {
    return this._value
  }
}
