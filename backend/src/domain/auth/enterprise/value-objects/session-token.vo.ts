import { createHash, randomBytes } from 'crypto'

export class SessionToken {
  private readonly _hash: string
  private readonly _rawToken: string | null

  private constructor(hash: string, rawToken: string | null) {
    this._hash = hash
    this._rawToken = rawToken
  }

  static generate(): SessionToken {
    const raw = randomBytes(48).toString('hex')
    const hash = createHash('sha256').update(raw).digest('hex')
    return new SessionToken(hash, raw)
  }

  static createFromHash(hash: string): SessionToken {
    return new SessionToken(hash, null)
  }

  get hash(): string {
    return this._hash
  }

  get rawToken(): string | null {
    return this._rawToken
  }

  equals(other: SessionToken): boolean {
    return this._hash === other._hash
  }

  toString(): string {
    return this._hash
  }
}
