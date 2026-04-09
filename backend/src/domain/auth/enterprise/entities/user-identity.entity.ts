import { randomBytes } from 'crypto'
import { AggregateRoot } from '@/core/aggregate-root'
import { UniqueEntityID } from '@/core/utils/unique-entity-id'
import { DomainEvents } from '@/core/domain/events/domain-events'
import { Email } from '../value-objects/email.vo'
import { Password } from '../value-objects/password.vo'
import { UserCreatedEvent } from '../events/user-created.event'

export interface UserIdentityProps {
  tenantId: string
  email: Email
  password: Password
  isEmailVerified: boolean
  emailVerificationToken?: string
  passwordResetToken?: string
  passwordResetExpiresAt?: Date
  failedLoginAttempts: number
  lockedUntil?: Date
  lastLoginAt?: Date
  deletedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export class UserIdentity extends AggregateRoot<UserIdentityProps> {
  private constructor(props: UserIdentityProps, id?: UniqueEntityID) {
    super(props, id)
  }

  static create(
    props: Pick<UserIdentityProps, 'tenantId' | 'email' | 'password'>,
    id?: UniqueEntityID,
  ): UserIdentity {
    const identity = new UserIdentity(
      {
        ...props,
        isEmailVerified: false,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    )
    identity.addDomainEvent(
      new UserCreatedEvent(identity.id, props.tenantId, props.email.value),
    )
    DomainEvents.markAggregateForDispatch(identity)
    return identity
  }

  static reconstitute(props: UserIdentityProps, id: UniqueEntityID): UserIdentity {
    return new UserIdentity(props, id)
  }

  // ── getters ───────────────────────────────────────────────────────────────

  get tenantId(): string { return this.props.tenantId }
  get email(): Email { return this.props.email }
  get password(): Password { return this.props.password }
  get isEmailVerified(): boolean { return this.props.isEmailVerified }
  get emailVerificationToken(): string | undefined { return this.props.emailVerificationToken }
  get passwordResetToken(): string | undefined { return this.props.passwordResetToken }
  get passwordResetExpiresAt(): Date | undefined { return this.props.passwordResetExpiresAt }
  get failedLoginAttempts(): number { return this.props.failedLoginAttempts }
  get lockedUntil(): Date | undefined { return this.props.lockedUntil }
  get lastLoginAt(): Date | undefined { return this.props.lastLoginAt }
  get deletedAt(): Date | undefined { return this.props.deletedAt }
  get createdAt(): Date { return this.props.createdAt ?? new Date() }

  // ── domain methods ────────────────────────────────────────────────────────

  isLocked(): boolean {
    if (!this.props.lockedUntil) return false
    return this.props.lockedUntil > new Date()
  }

  incrementFailedAttempts(): void {
    this.props.failedLoginAttempts += 1
    this.touch()
    if (this.props.failedLoginAttempts >= 5) {
      this.lockAccount(15)
    }
  }

  resetFailedAttempts(): void {
    this.props.failedLoginAttempts = 0
    this.props.lockedUntil = undefined
    this.touch()
  }

  lockAccount(minutes: number): void {
    const until = new Date()
    until.setMinutes(until.getMinutes() + minutes)
    this.props.lockedUntil = until
    this.touch()
  }

  recordLogin(): void {
    this.props.lastLoginAt = new Date()
    this.touch()
  }

  verifyEmail(): void {
    this.props.isEmailVerified = true
    this.props.emailVerificationToken = undefined
    this.touch()
  }

  requestPasswordReset(): string {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 2)
    this.props.passwordResetToken = token
    this.props.passwordResetExpiresAt = expiresAt
    this.touch()
    return token
  }

  changePassword(newPassword: Password): void {
    this.props.password = newPassword
    this.props.passwordResetToken = undefined
    this.props.passwordResetExpiresAt = undefined
    this.touch()
  }

  softDelete(): void {
    this.props.deletedAt = new Date()
    this.props.email = Email.createTrusted(
      `deleted_${this.id.toString()}@deleted.invalid`,
    )
    this.touch()
  }

  private touch(): void {
    this.props.updatedAt = new Date()
  }
}
