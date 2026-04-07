export class InvalidEmailError extends Error {
  constructor(reason: string) {
    super(`Invalid email: ${reason}`)
    this.name = 'InvalidEmailError'
  }
}

export class Email {
  private readonly _value: string

  private constructor(value: string) {
    this._value = value
  }

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase()
    Email.validate(normalized)
    return new Email(normalized)
  }

  static createTrusted(raw: string): Email {
    return new Email(raw)
  }

  private static validate(email: string): void {
    if (email.length > 254) {
      throw new InvalidEmailError('exceeds 254 characters')
    }

    const atIndex = email.indexOf('@')
    if (atIndex <= 0) {
      throw new InvalidEmailError('missing or misplaced @')
    }

    const local = email.slice(0, atIndex)
    const domain = email.slice(atIndex + 1)

    if (!local || local.length > 64) {
      throw new InvalidEmailError('local part empty or exceeds 64 characters')
    }

    if (!domain) {
      throw new InvalidEmailError('domain is empty')
    }

    if (local.startsWith('.') || local.endsWith('.')) {
      throw new InvalidEmailError('local part cannot start or end with a dot')
    }

    if (local.includes('..')) {
      throw new InvalidEmailError('local part cannot have consecutive dots')
    }

    if (!domain.includes('.')) {
      throw new InvalidEmailError('domain must contain at least one dot')
    }
  }

  get value(): string {
    return this._value
  }

  equals(other: Email): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
