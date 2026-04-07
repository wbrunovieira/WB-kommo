import { hash, compare } from 'bcryptjs'

const SALT_ROUNDS = process.env.NODE_ENV === 'test' ? 1 : 12

const COMMON_PASSWORDS = new Set([
  'Password1!',
  'Password123!',
  'Qwerty123!',
  'Admin123!',
  'Welcome1!',
])

export class WeakPasswordError extends Error {
  constructor(reason: string) {
    super(`Weak password: ${reason}`)
    this.name = 'WeakPasswordError'
  }
}

export class Password {
  private readonly _hash: string

  private constructor(passwordHash: string) {
    this._hash = passwordHash
  }

  static async create(raw: string): Promise<Password> {
    Password.validate(raw)
    const hashed = await hash(raw, SALT_ROUNDS)
    return new Password(hashed)
  }

  static createFromHash(existingHash: string): Password {
    return new Password(existingHash)
  }

  static generate(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const lower = 'abcdefghjkmnpqrstuvwxyz'
    const digits = '23456789'
    const specials = '!@#$%&*'
    const all = upper + lower + digits + specials

    const rand = (chars: string) =>
      chars[Math.floor(Math.random() * chars.length)]

    const required = [rand(upper), rand(lower), rand(digits), rand(specials)]
    const rest = Array.from({ length: 8 }, () => rand(all))
    return [...required, ...rest]
      .sort(() => Math.random() - 0.5)
      .join('')
  }

  private static validate(raw: string): void {
    if (raw.length < 8) {
      throw new WeakPasswordError('must be at least 8 characters')
    }
    if (raw.length > 100) {
      throw new WeakPasswordError('must be at most 100 characters')
    }
    if (!/[A-Z]/.test(raw)) {
      throw new WeakPasswordError('must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(raw)) {
      throw new WeakPasswordError('must contain at least one lowercase letter')
    }
    if (!/[0-9]/.test(raw)) {
      throw new WeakPasswordError('must contain at least one number')
    }
    if (!/[^A-Za-z0-9]/.test(raw)) {
      throw new WeakPasswordError('must contain at least one special character')
    }
    if (COMMON_PASSWORDS.has(raw)) {
      throw new WeakPasswordError('password is too common')
    }
  }

  get value(): string {
    return this._hash
  }

  async compare(raw: string): Promise<boolean> {
    return compare(raw, this._hash)
  }
}
